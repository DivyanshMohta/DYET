import mongoose, { Schema, Document } from "mongoose";

export interface IUnit {
  unitNumber: number;
  notesFileUrl: string; // URL to the Cloudinary-stored PDF for this unit
  publicId: string; // Cloudinary public ID for management
  summary?: string; // Optional summary for the unit
  quiz: {
    question: string;
    options: string[];
    answer: string;
  }[];
}

export interface ICourse extends Document {
  year: string;
  branch: string;
  subjects: {
    name: string;
    units: IUnit[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema(
  {
    year: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    subjects: [
      {
        name: {
          type: String,
          required: true,
        },
        units: [
          {
            unitNumber: {
              type: Number,
              required: true,
            },
            notesFileUrl: {
              type: String,
              required: true,
            },
            publicId: {
              type: String,
              required: true,
            },
            summary: {
              type: String,
              default: "",
            },
            quiz: {
              type: [
                {
                  question: {
                    type: String,
                    required: true,
                  },
                  options: {
                    type: [String],
                    required: true,
                  },
                  answer: {
                    type: String,
                    required: true,
                  },
                },
              ],
              default: [],
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Course =
  mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);
export default Course;