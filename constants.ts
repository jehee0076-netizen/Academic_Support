
import { Subject, SubjectType, Semester, GraduationRequirements } from './types';

export const INITIAL_SUBJECTS: Subject[] = [
  // 1학기 과목
  { id: 'BMED205', name: '공학수학I', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED208', name: '생체유체역학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED212', name: '기초광학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED215', name: '해부학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED217', name: '회로이론', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED219', name: '유기화학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED223', name: '의공학프로그래밍', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED228', name: '의공학의이해', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED301', name: '생화학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED311', name: '생체신호처리', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED313', name: '생체재료', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] },
  { id: 'BMED321', name: '디지털시스템', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: ['BMED217', 'BMED230'] },
  { id: 'BMED323', name: '의공학실험I', credits: 2, type: SubjectType.MANDATORY, offeredTerm: 1, prerequisites: ['BMED217'] },
  { id: 'BMED325', name: '생체데이터과학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: ['BMED223'] },
  { id: 'BMED329', name: '의공학실험III', credits: 2, type: SubjectType.MANDATORY, offeredTerm: 1, prerequisites: ['BMED212', 'BMED309'] },

  // 2학기 과목
  { id: 'BMED202', name: '공학수학II', credits: 3, type: SubjectType.MANDATORY, offeredTerm: 2, prerequisites: ['BMED205'] },
  { id: 'BMED211', name: '생체역학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED218', name: '생리학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: ['BMED215'] },
  { id: 'BMED224', name: '물리화학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED230', name: '전자회로', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: ['BMED217'] },
  { id: 'BMED306', name: '세포생물학', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED307', name: '생체전달시스템', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED309', name: '의료영상', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED312', name: '생체정보계측', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: ['BMED217', 'BMED311'] },
  { id: 'BMED318', name: '의학영상처리', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
  { id: 'BMED326', name: '의공학실험II', credits: 2, type: SubjectType.MANDATORY, offeredTerm: 2, prerequisites: ['BMED313'] },
  { id: 'BMED330', name: '바이오메디컬소재공정', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 2, prerequisites: [] },
];

export const INITIAL_SEMESTERS: Semester[] = [
  { id: 'sem25-2', year: 25, term: 2, assignedSubjectIds: ['BMED202', 'BMED218'] },
  { id: 'sem26-1', year: 26, term: 1, assignedSubjectIds: [] },
  { id: 'sem26-2', year: 26, term: 2, assignedSubjectIds: [] },
  { id: 'sem27-1', year: 27, term: 1, assignedSubjectIds: [] },
];

export const GRADUATION_REQUIREMENTS: GraduationRequirements = {
  mandatory: 5,
  elective: 40,
};
