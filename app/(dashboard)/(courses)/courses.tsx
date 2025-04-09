"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, GraduationCap, BookOpen, Library } from "lucide-react";

const engineeringYears = [
  "First Year",
  "Second Year",
  "Third Year",
  "Final Year",
];

const branches = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
];

interface Unit {
  unitNumber: number;
  notesFileUrl: string;
  summary: string;
  quiz: {
    question: string;
    options: string[];
    answer: string;
  }[];
}

interface Subject {
  name: string;
  units: Unit[];
}

export default function Courses() {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedUnitData, setSelectedUnitData] = useState<Unit | null>(null);
  const [quiz, setQuiz] = useState<
    { question: string; options: string[]; answer: string }[]
  >([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedYear && selectedBranch) {
      fetchSubjects(selectedYear, selectedBranch);
    }
  }, [selectedYear, selectedBranch]);

  const fetchSubjects = async (year: string, branch: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/course?year=${encodeURIComponent(
          year
        )}&branch=${encodeURIComponent(branch)}`
      );
      const data = await response.json();
      console.log("API Response:", data);
      if (data.courses && data.courses.length > 0) {
        let allSubjects: Subject[] = [];
        data.courses.forEach((course: any) => {
          if (course.subjects && Array.isArray(course.subjects)) {
            allSubjects = [...allSubjects, ...course.subjects];
          }
        });
        // Deduplicate subjects by name
        const uniqueSubjects = Array.from(
          new Map(
            allSubjects.map((subject) => [subject.name, subject])
          ).values()
        );
        setSubjects(uniqueSubjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedBranch("");
    setSelectedSubject("");
    setSelectedUnit("");
    setSubjects([]);
    setSelectedUnitData(null);
    setQuiz([]);
  };

  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setSelectedSubject("");
    setSelectedUnit("");
    setSelectedUnitData(null);
    setQuiz([]);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedUnit("");
    setSelectedUnitData(null);
    setQuiz([]);
  };

  const handleUnitChange = (value: string) => {
    setSelectedUnit(value);
    const subject = subjects.find((s) => s.name === selectedSubject);
    const unit = subject?.units.find((u) => u.unitNumber.toString() === value);
    if (unit) {
      setSelectedUnitData(unit);
      // Select up to 10 quiz questions randomly
      const shuffledQuiz = unit.quiz.sort(() => 0.5 - Math.random());
      setQuiz(shuffledQuiz.slice(0, Math.min(10, shuffledQuiz.length)));
    } else {
      setSelectedUnitData(null);
      setQuiz([]);
    }
  };

  const handleAnswerChange = (questionIndex: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const handleSubmitQuiz = () => {
    const score = quiz.reduce((acc, question, index) => {
      if (userAnswers[index.toString()] === question.answer) {
        return acc + 1;
      }
      return acc;
    }, 0);
    alert(`You scored ${score} out of ${quiz.length}`);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Course Selection
        </h1>
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Select Year</h2>
            </div>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your year" />
              </SelectTrigger>
              <SelectContent>
                {engineeringYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
          <Card className={`p-6 ${!selectedYear ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Select Branch</h2>
            </div>
            <Select
              value={selectedBranch}
              onValueChange={handleBranchChange}
              disabled={!selectedYear}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose your branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
          <Card className={`p-6 ${!selectedBranch ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <Library className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Select Subject</h2>
            </div>
            <Select
              value={selectedSubject}
              onValueChange={handleSubjectChange}
              disabled={!selectedBranch || isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading ? "Loading subjects..." : "Choose your subject"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.name} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
          <Card className={`p-6 ${!selectedSubject ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <Library className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Select Unit</h2>
            </div>
            <Select
              value={selectedUnit}
              onValueChange={handleUnitChange}
              disabled={!selectedSubject || isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading ? "Loading units..." : "Choose your unit"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjects
                  .find((s) => s.name === selectedSubject)
                  ?.units.map((unit) => (
                    <SelectItem
                      key={unit.unitNumber}
                      value={unit.unitNumber.toString()}
                    >
                      Unit {unit.unitNumber}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Card>
        </div>
        {selectedUnitData && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Unit Notes</h2>
              <iframe
                src={selectedUnitData.notesFileUrl}
                width="100%"
                height="600px"
                style={{ border: "none" }}
                title="PDF Viewer"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Summary</h2>
              <p className="text-gray-700 bg-gray-100 p-4 rounded-md">
                {selectedUnitData.summary || "No summary available."}
              </p>
            </div>
          </div>
        )}
        {quiz.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Quiz (Max 10 Questions)</h2>
            {quiz.map((question, index) => (
              <div key={`question-${index}`} className="mb-6">
                <h3 className="text-lg font-semibold">
                  {index + 1}. {question.question}
                </h3>
                <div className="space-y-2 mt-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={`option-${index}-${optionIndex}`}
                      className="flex items-center"
                    >
                      <input
                        type="radio"
                        id={`question-${index}-option-${optionIndex}`}
                        name={`question-${index}`}
                        value={option}
                        onChange={() =>
                          handleAnswerChange(index.toString(), option)
                        }
                        className="mr-2"
                      />
                      <label
                        htmlFor={`question-${index}-option-${optionIndex}`}
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button
              className="w-full mt-8 py-6 text-lg"
              onClick={handleSubmitQuiz}
              disabled={Object.keys(userAnswers).length < quiz.length}
            >
              Submit Quiz
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
