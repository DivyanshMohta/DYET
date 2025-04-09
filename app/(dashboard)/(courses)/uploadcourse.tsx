"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  Upload,
  Plus,
  Minus,
  Loader2,
  File,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface FileWithPreview extends File {
  preview?: string;
}

interface Unit {
  unitNumber: number;
  notesFile?: FileWithPreview;
  fileSize?: string;
  fileType?: string;
  uploadProgress?: number;
  uploadStatus?: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
}

interface Subject {
  name: string;
  units: Unit[];
}

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

const acceptedFileTypes = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      name: "",
      units: [{ unitNumber: 1, uploadStatus: "idle", uploadProgress: 0 }],
    },
  ]);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [recentUploads, setRecentUploads] = useState<
    { course: string; subject: string; unit: number; url: string }[]
  >([]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const savedUploads = localStorage.getItem("recentUploads");
    if (savedUploads) {
      try {
        setRecentUploads(JSON.parse(savedUploads).slice(0, 3));
      } catch (e) {
        console.error("Failed to parse recent uploads", e);
      }
    }
  }, []);

  const addSubject = () => {
    setSubjects([
      ...subjects,
      {
        name: "",
        units: [{ unitNumber: 1, uploadStatus: "idle", uploadProgress: 0 }],
      },
    ]);
  };

  const removeSubject = (index: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  const addUnit = (subjectIndex: number) => {
    const updatedSubjects = [...subjects];
    const nextUnitNumber = updatedSubjects[subjectIndex].units.length + 1;
    updatedSubjects[subjectIndex].units.push({
      unitNumber: nextUnitNumber,
      uploadStatus: "idle",
      uploadProgress: 0,
    });
    setSubjects(updatedSubjects);
  };

  const removeUnit = (subjectIndex: number, unitIndex: number) => {
    const updatedSubjects = [...subjects];
    if (updatedSubjects[subjectIndex].units.length > 1) {
      updatedSubjects[subjectIndex].units = updatedSubjects[
        subjectIndex
      ].units.filter((_, i) => i !== unitIndex);
      setSubjects(updatedSubjects);
    }
  };

  const updateSubject = (
    index: number,
    field: keyof Subject,
    value: string
  ) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    setSubjects(updatedSubjects);
  };

  const updateUnit = (
    subjectIndex: number,
    unitIndex: number,
    field: keyof Unit,
    value: any
  ) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[subjectIndex].units[unitIndex] = {
      ...updatedSubjects[subjectIndex].units[unitIndex],
      [field]: value,
    };
    setSubjects(updatedSubjects);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange =
    (subjectIndex: number, unitIndex: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0] as FileWithPreview;
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

      if (!acceptedFileTypes.includes(fileExtension)) {
        toast.error(
          `Invalid file type. Accepted types: ${acceptedFileTypes.join(", ")}`
        );
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit");
        return;
      }

      updateUnit(subjectIndex, unitIndex, "notesFile", file);
      updateUnit(
        subjectIndex,
        unitIndex,
        "fileSize",
        formatFileSize(file.size)
      );
      updateUnit(
        subjectIndex,
        unitIndex,
        "fileType",
        fileExtension.slice(1).toUpperCase()
      );
      updateUnit(subjectIndex, unitIndex, "uploadStatus", "idle");
      updateUnit(subjectIndex, unitIndex, "uploadProgress", 0);
    };

  const updateUploadProgress = (
    subjectIndex: number,
    unitIndex: number,
    progress: number
  ) => {
    updateUnit(subjectIndex, unitIndex, "uploadProgress", progress);
    updateUnit(
      subjectIndex,
      unitIndex,
      "uploadStatus",
      progress === 100 ? "success" : "uploading"
    );

    const totalUnits = subjects.reduce((sum, s) => sum + s.units.length, 0);
    const progressSum = subjects.reduce((sum, s) => {
      return (
        sum +
        s.units.reduce((unitSum, u) => unitSum + (u.uploadProgress || 0), 0)
      );
    }, 0);
    setOverallProgress(progressSum / totalUnits);
  };

  const saveRecentUpload = (
    course: string,
    subject: string,
    unit: number,
    url: string
  ) => {
    const newUpload = { course, subject, unit, url };
    const updatedUploads = [newUpload, ...recentUploads].slice(0, 3);
    setRecentUploads(updatedUploads);
    localStorage.setItem("recentUploads", JSON.stringify(updatedUploads));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedYear || !selectedBranch) {
      toast.error("Please select year and branch");
      return;
    }

    const validSubjects = subjects.filter(
      (subject) =>
        subject.name.trim() && subject.units.some((unit) => unit.notesFile)
    );
    if (validSubjects.length === 0) {
      toast.error("Please add at least one subject with a unit and notes file");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Preparing to upload files...");

    try {
      const formData = new FormData();
      formData.append("year", selectedYear);
      formData.append("branch", selectedBranch);

      const subjectsToSave = validSubjects.map((subject) => ({
        name: subject.name.trim(),
        units: subject.units
          .filter((unit) => unit.notesFile)
          .map((unit) => ({
            unitNumber: unit.unitNumber,
          })),
      }));
      formData.append("subjects", JSON.stringify(subjectsToSave));

      subjects.forEach((subject, subjectIndex) => {
        subject.units.forEach((unit, unitIndex) => {
          if (unit.notesFile) {
            formData.append(
              `notes-file-${subjectIndex}-${unitIndex}`,
              unit.notesFile,
              unit.notesFile.name
            );
            updateUnit(subjectIndex, unitIndex, "uploadStatus", "uploading");
          }
        });
      });

      toast.dismiss(toastId);
      toast.loading("Uploading files to Cloudinary...");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/course", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setOverallProgress(percentComplete);

          subjects.forEach((subject, sIdx) => {
            subject.units.forEach((unit, uIdx) => {
              if (unit.notesFile) {
                updateUploadProgress(sIdx, uIdx, percentComplete);
              }
            });
          });
        }
      };

      xhr.onload = function () {
        if (xhr.status === 201 || xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);

          toast.success("Notes uploaded successfully!");

          if (response.course && response.course.subjects) {
            response.course.subjects.forEach((subj: any) => {
              subj.units.forEach((unit: any) => {
                const courseName = `${selectedYear} - ${selectedBranch}`;
                saveRecentUpload(
                  courseName,
                  subj.name,
                  unit.unitNumber,
                  unit.notesFileUrl
                );
              });
            });
          }

          setSelectedYear("");
          setSelectedBranch("");
          setSubjects([
            {
              name: "",
              units: [
                { unitNumber: 1, uploadStatus: "idle", uploadProgress: 0 },
              ],
            },
          ]);
          setOverallProgress(0);
        } else {
          throw new Error("Failed to upload notes");
        }
        setIsLoading(false);
      };

      xhr.onerror = function () {
        toast.error("Failed to upload notes. Please try again.");
        setIsLoading(false);

        setSubjects((prev) =>
          prev.map((s) => ({
            ...s,
            units: s.units.map((u) =>
              u.uploadStatus === "uploading"
                ? { ...u, uploadStatus: "error", errorMessage: "Upload failed" }
                : u
            ),
          }))
        );
      };

      xhr.send(formData);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to upload notes. Please try again.");
      console.error("Upload error:", error);
      setIsLoading(false);
    }
  };

  const triggerFileInput = (inputId: string) => {
    if (fileInputRefs.current[inputId]) {
      fileInputRefs.current[inputId]?.click();
    }
  };

  return (
    <div className="min-h-screen py-12 max-w-4xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl font-bold text-center">
              Upload Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="year">Academic Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {engineeringYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    value={selectedBranch}
                    onValueChange={setSelectedBranch}
                  >
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {subjects.map((subject, subjectIndex) => (
          <Card
            key={subjectIndex}
            className={`transition-all duration-200 ${
              subject.units.every((u) => u.uploadStatus === "success")
                ? "border-green-500 bg-green-50"
                : subject.units.some((u) => u.uploadStatus === "error")
                ? "border-red-500 bg-red-50"
                : ""
            }`}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`subject-${subjectIndex}`}>
                      Subject Name
                    </Label>
                    <Input
                      id={`subject-${subjectIndex}`}
                      value={subject.name}
                      onChange={(e) =>
                        updateSubject(subjectIndex, "name", e.target.value)
                      }
                      placeholder="Enter subject name"
                      disabled={subject.units.some(
                        (u) =>
                          u.uploadStatus === "success" ||
                          u.uploadStatus === "uploading"
                      )}
                    />
                  </div>
                  {subjects.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeSubject(subjectIndex)}
                      disabled={subject.units.some(
                        (u) => u.uploadStatus === "uploading"
                      )}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {subject.units.map((unit, unitIndex) => (
                  <div key={unitIndex} className="space-y-2 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <Label>Unit {unit.unitNumber} Notes</Label>
                      {subject.units.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeUnit(subjectIndex, unitIndex)}
                          disabled={unit.uploadStatus === "uploading"}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-2 items-center">
                      <input
                        type="file"
                        id={`notes-file-${subjectIndex}-${unitIndex}`}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        onChange={handleFileChange(subjectIndex, unitIndex)}
                        ref={(el) =>
                          (fileInputRefs.current[
                            `notes-file-${subjectIndex}-${unitIndex}`
                          ] = el)
                        }
                        disabled={
                          unit.uploadStatus === "uploading" ||
                          unit.uploadStatus === "success"
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          triggerFileInput(
                            `notes-file-${subjectIndex}-${unitIndex}`
                          )
                        }
                        disabled={
                          unit.uploadStatus === "uploading" ||
                          unit.uploadStatus === "success"
                        }
                        className={unit.notesFile ? "bg-blue-50" : ""}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {unit.notesFile ? "Change File" : "Upload File"}
                      </Button>

                      {unit.uploadStatus === "success" && (
                        <span className="text-green-500 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Uploaded
                        </span>
                      )}

                      {unit.uploadStatus === "error" && (
                        <span className="text-red-500 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {unit.errorMessage || "Failed"}
                        </span>
                      )}
                    </div>

                    {unit.notesFile && (
                      <div className="bg-slate-50 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <File className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm font-medium truncate max-w-[250px]">
                              {unit.notesFile.name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {unit.fileSize} | {unit.fileType}
                          </div>
                        </div>

                        {unit.uploadStatus === "uploading" && (
                          <div className="mt-2">
                            <Progress
                              value={unit.uploadProgress}
                              className="h-2"
                            />
                            <div className="text-xs text-right mt-1">
                              {Math.round(unit.uploadProgress || 0)}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addUnit(subjectIndex)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Unit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4 flex-col">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addSubject}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Subject
          </Button>

          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600"
            disabled={
              isLoading ||
              !subjects.some((s) => s.name && s.units.some((u) => u.notesFile))
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading... {Math.round(overallProgress)}%
              </>
            ) : (
              <>
                Upload Notes
                <Upload className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {isLoading && (
          <div className="mt-4">
            <Progress value={overallProgress} className="h-2" />
            <p className="text-sm text-center mt-2 text-muted-foreground">
              Uploading to Cloudinary... {Math.round(overallProgress)}%
            </p>
          </div>
        )}

        {recentUploads.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recentUploads.map((upload, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {upload.subject} - Unit {upload.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {upload.course}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
