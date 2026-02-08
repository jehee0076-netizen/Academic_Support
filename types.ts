
export enum SubjectType {
  MANDATORY = '전공필수',
  ELECTIVE = '전공선택',
}

export interface Subject {
  id: string;
  name: string;
  credits: number;
  type: SubjectType;
  offeredTerm: 1 | 2; // Which semester it's usually opened in
  prerequisites: string[]; // List of subject IDs
  isRetake?: boolean;
}

export interface Semester {
  id: string;
  year: number;
  term: 1 | 2;
  assignedSubjectIds: string[];
}

export interface GraduationRequirements {
  mandatory: number;
  elective: number;
}
