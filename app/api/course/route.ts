import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "../(lib)/mongodb";
import Course from "../(model)/Course";
import { uploadToCloudinary } from "../(lib)/cloudinary";
import axios from "axios";
import { PdfReader } from "pdfreader";

const API_KEY = "AIzaSyCIFxqaCGYGBy3YJZFKMKVgMguOMBIX1k0"; // Your Gemini API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Helper function to extract text from PDF
const extractTextFromPDF = async (pdfBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    let extractedText = "";
    new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
      if (err) {
        reject(`Error reading PDF: ${err}`);
      } else if (!item) {
        resolve(extractedText.trim());
      } else if (item.text) {
        extractedText += item.text + " ";
      }
    });
  });
};

// Helper function to generate content (summary or quiz) using Gemini API
const generateContent = async (text: string, type: "summary" | "quiz"): Promise<string> => {
  try {
    const maxLength = 90000; // Split text into chunks to avoid API limits
    const textChunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
      textChunks.push(text.slice(i, i + maxLength));
    }

    const responses = await Promise.all(
      textChunks.map(async (chunk) => {
        const prompt =
          type === "summary"
            ? `Generate a concise summary of this content:\n\n${chunk}`
            : `Generate a multiple-choice quiz from this content in JSON format like this:\n{\n  "quiz": [\n    {\n      "question": "What is the capital of France?",\n      "options": ["Berlin", "Madrid", "Paris", "Rome"],\n      "answer": "Paris"\n    }\n  ]\n}\n\n${chunk}`;
        const response = await axios.post(API_URL, {
          contents: [{ parts: [{ text: prompt }] }],
        });
        return response.data;
      })
    );

    const combinedText = responses
      .map((result) => result?.candidates?.[0]?.content?.parts?.[0]?.text || "")
      .join(" ");
    return combinedText;
  } catch (error: any) {
    console.error(`Failed to generate ${type}:`, error);
    return type === "summary"
      ? "Summary generation failed."
      : JSON.stringify({
          quiz: [
            {
              question: "What is the capital of France?",
              options: ["Berlin", "Madrid", "Paris", "Rome"],
              answer: "Paris",
            },
          ],
        });
  }
};

// Helper function to clean quiz data
const cleanQuizData = (quizData: string): string => {
  let cleaned = quizData.replace(/```json/g, "").replace(/```/g, "").trim();
  const jsonStartPos = cleaned.indexOf("{");
  const jsonEndPos = cleaned.lastIndexOf("}") + 1;
  if (jsonStartPos >= 0 && jsonEndPos > jsonStartPos) {
    cleaned = cleaned.substring(jsonStartPos, jsonEndPos);
  }
  return cleaned;
};

// Helper function to parse quiz data
const parseQuizData = (quizData: string): any[] => {
  try {
    const cleanedQuizData = cleanQuizData(quizData);
    const parsedData = JSON.parse(cleanedQuizData);
    if (!parsedData || !parsedData.quiz || !Array.isArray(parsedData.quiz)) {
      return [];
    }
    return parsedData.quiz.filter((item: any) => {
      return (
        item.question &&
        typeof item.question === "string" &&
        item.options &&
        Array.isArray(item.options) &&
        item.answer &&
        typeof item.answer === "string"
      );
    });
  } catch (error) {
    console.error("Error parsing quiz data:", error);
    return [];
  }
};

// POST endpoint to create or update a course
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await req.formData();
    const year = formData.get("year") as string;
    const branch = formData.get("branch") as string;
    const subjects = JSON.parse(formData.get("subjects") as string);

    if (!year || !branch || !subjects || !Array.isArray(subjects)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const processedSubjects = await Promise.all(
      subjects.map(async (subject: any, subjectIndex: number) => {
        if (!subject.name.trim() || !subject.units.length) {
          console.warn(`Skipping subject ${subject.name} due to missing name or units`);
          return null;
        }

        const processedUnits = await Promise.all(
          subject.units.map(async (unit: any, unitIndex: number) => {
            const notesFile = formData.get(`notes-file-${subjectIndex}-${unitIndex}`) as File | null;
            if (!notesFile) {
              console.warn(`Skipping unit ${unit.unitNumber} in ${subject.name} due to missing file`);
              return null;
            }

            const notesFileBuffer = Buffer.from(await notesFile.arrayBuffer());
            const folderPath = `engineering-notes/${year
              .replace(/\s+/g, "-")
              .toLowerCase()}/${branch.replace(/\s+/g, "-").toLowerCase()}`;
            const fileName = `${subject.name
              .replace(/\s+/g, "-")
              .toLowerCase()}-unit-${unit.unitNumber}-${Date.now()}`;

            let uploadResult;
            try {
              uploadResult = await uploadToCloudinary(notesFileBuffer, folderPath, fileName);
            } catch (error) {
              console.error(`Cloudinary upload failed for ${subject.name} Unit ${unit.unitNumber}:`, error);
              throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
            }

            if (!uploadResult || !uploadResult.url || !uploadResult.public_id) {
              console.error(`Invalid upload result for ${subject.name} Unit ${unit.unitNumber}:`, uploadResult);
              throw new Error(`Invalid upload result for ${subject.name} Unit ${unit.unitNumber}`);
            }

            const notesFileUrl = uploadResult.url;
            const publicId = uploadResult.public_id;

            let pdfText;
            try {
              const response = await axios.get(notesFileUrl, { responseType: "arraybuffer" });
              pdfText = await extractTextFromPDF(Buffer.from(response.data));
            } catch (error) {
              console.error(`Failed to extract text from PDF for ${subject.name} Unit ${unit.unitNumber}:`, error);
              pdfText = "Text extraction failed.";
            }

            const summary = await generateContent(pdfText, "summary");
            const quizData = await generateContent(pdfText, "quiz");
            const quiz = parseQuizData(quizData);

            return {
              unitNumber: unit.unitNumber,
              notesFileUrl,
              publicId,
              summary,
              quiz,
            };
          })
        );

        const validUnits = processedUnits.filter((unit) => unit !== null);
        if (validUnits.length === 0) {
          console.warn(`No valid units for subject ${subject.name}`);
          return null;
        }

        return {
          name: subject.name.trim(),
          units: validUnits,
        };
      })
    );

    const validSubjects = processedSubjects.filter((subject) => subject !== null);

    if (validSubjects.length === 0) {
      return NextResponse.json({ message: "No valid subjects provided" }, { status: 400 });
    }

    const existingCourse = await Course.findOne({ year, branch });

    if (existingCourse) {
      validSubjects.forEach((newSubject: any) => {
        const existingSubject = existingCourse.subjects.find(
          (s: any) => s.name === newSubject.name
        );
        if (existingSubject) {
          newSubject.units.forEach((newUnit: any) => {
            const existingUnit = existingSubject.units.find(
              (u: any) => u.unitNumber === newUnit.unitNumber
            );
            if (!existingUnit) {
              existingSubject.units.push(newUnit);
            } else {
              existingUnit.notesFileUrl = newUnit.notesFileUrl;
              existingUnit.publicId = newUnit.publicId;
              existingUnit.summary = newUnit.summary;
              existingUnit.quiz = newUnit.quiz;
            }
          });
        } else {
          existingCourse.subjects.push(newSubject);
        }
      });
      await existingCourse.save();

      return NextResponse.json(
        {
          message: "Subjects and units added to existing course!",
          course: existingCourse,
        },
        { status: 200 }
      );
    } else {
      const newCourse = new Course({
        year,
        branch,
        subjects: validSubjects,
      });

      const savedCourse = await newCourse.save();

      return NextResponse.json(
        {
          message: "Course added successfully!",
          course: savedCourse,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error saving course:", error);
    return NextResponse.json(
      {
        message: "Error saving course",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch courses or quizzes
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const branch = url.searchParams.get("branch");
    const subjectName = url.searchParams.get("subject");
    const unitNumber = url.searchParams.get("unitNumber");
    const quizOnly = url.searchParams.get("quizOnly") === "true";

    const query: any = {};
    if (year) query.year = year;
    if (branch) query.branch = branch;

    const courses = await Course.find(query);

    if (quizOnly && subjectName) {
      const quizzes = [];
      for (const course of courses) {
        const matchedSubject = course.subjects.find(
          (subject: any) => subject.name === subjectName
        );
        if (matchedSubject) {
          const units = unitNumber
            ? matchedSubject.units.filter((unit: any) => unit.unitNumber === Number(unitNumber))
            : matchedSubject.units;
          units.forEach((unit: any) => {
            if (unit.quiz && unit.quiz.length > 0) {
              quizzes.push({
                courseId: course._id,
                year: course.year,
                branch: course.branch,
                subjectName: matchedSubject.name,
                unitNumber: unit.unitNumber,
                quiz: unit.quiz,
                summary: unit.summary,
              });
            }
          });
        }
      }
      return NextResponse.json({ quizzes }, { status: 200 });
    }

    if (subjectName) {
      const filteredCourses = courses.map((course) => ({
        ...course.toObject(),
        subjects: course.subjects
          .filter((subject: any) => subject.name === subjectName)
          .map((subject: any) => ({
            ...subject,
            units: unitNumber
              ? subject.units.filter((unit: any) => unit.unitNumber === Number(unitNumber))
              : subject.units,
          })),
      }));
      return NextResponse.json({ courses: filteredCourses }, { status: 200 });
    }

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      {
        message: "Error fetching courses",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}