import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Schools from './pages/super-admin/Schools';
import SchoolAdminDashboard from './pages/SchoolAdminDashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
// import StudentDashboard from './pages/student/Dashboard';
import Settings from './pages/super-admin/Settings';
import Countries from './pages/super-admin/Countries';
import Curriculums from './pages/super-admin/Curriculums';
import SchoolTypes from './pages/super-admin/SchoolTypes';
import UserManagement from './pages/super-admin/UserManagement';
import TrainViaLLM from './pages/super-admin/TrainViaLLM';
import TrainFileDetails from './pages/super-admin/TrainFileDetails';
import TrainProgress from './pages/super-admin/TrainProgress';

// School Admin Pages
import TeachersList from './pages/school-admin/TeachersList';
import StudentsList from './pages/school-admin/StudentsList';
import SubjectsList from './pages/school-admin/SubjectsList';
import GradesList from './pages/school-admin/GradesList';
import UploadPdf from './pages/school-admin/UploadPdf';
import QuestionBank from './pages/school-admin/QuestionBank';
import QuestionBankDetails from './pages/school-admin/QuestionBankDetails';
import Classes from './pages/school-admin/Classes';
import TeacherClasses from './pages/school-admin/TeacherClasses';
import GradeSubjects from './pages/school-admin/GradeSubjects';

// Teacher Pages
import TeacherAssignments from './pages/teacher/Assignments';
import QuizDetails from './pages/teacher/QuizDetails';
import TeacherStudents from './pages/teacher/Students';
import TeacherGrading from './pages/teacher/Grading';
import StudentGrading from './pages/teacher/StudentGrading';
import TeacherQuestionBank from './pages/teacher/QuestionBank';
import TeacherUploadPdf from './pages/teacher/UploadPdf';

// Student Pages
import StudentAssignments from './pages/student/Assignments';
import Schedule from './pages/student/Schedule';
import StudentGrades from './pages/student/Grades';

// Individual Pages
import IndividualDashboard from './pages/individual/Dashboard';
import IndividualQuizzes from './pages/individual/MyQuizzes';
import IndividualSettings from './pages/individual/Settings';
import Register from './pages/Register';


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        {/* Wrapped in Layout */}
        <Route path="/" element={<DashboardLayout><Outlet /></DashboardLayout>}>
          {/* SUPER ADMIN */}
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          <Route path="schools" element={<Schools />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="train-llm" element={<TrainViaLLM />} />
          <Route path="train-llm/:fileId" element={<TrainFileDetails />} />
          <Route path="train-llm/:fileId/progress" element={<TrainProgress />} />
          {/* Settings Sub-routes */}
          <Route path="settings/countries" element={<Countries />} />
          <Route path="settings/curriculums" element={<Curriculums />} />
          <Route path="settings/school-types" element={<SchoolTypes />} />
          {/* SCHOOL ADMIN */}
          <Route path="school-admin" element={<SchoolAdminDashboard />} />
          <Route path="school-admin/teachers" element={<TeachersList />} />
          <Route path="school-admin/teachers/:id/classes" element={<TeacherClasses />} />
          <Route path="school-admin/students" element={<StudentsList />} />
          <Route path="school-admin/subjects" element={<SubjectsList />} />
          <Route path="school-admin/grades" element={<GradesList />} />
          <Route path="school-admin/grades/:gradeId/subjects" element={<GradeSubjects />} />
          <Route path="school-admin/upload-pdf" element={<UploadPdf />} />
          <Route path="school-admin/upload-pdf/:gradeId" element={<QuestionBankDetails />} />
          <Route path="school-admin/question-bank" element={<QuestionBank />} />
          <Route path="school-admin/classes" element={<Classes />} />

          {/* TEACHER */}
          <Route path="teacher" element={<TeacherDashboard />} />
          {/* Teacher Pages */}
          <Route path="teacher/assignments" element={<TeacherAssignments />} />
          <Route path="teacher/assignments/:assignmentId/questions" element={<QuizDetails />} />
          <Route path="teacher/question-bank" element={<TeacherQuestionBank />} />
          <Route path="teacher/students" element={<TeacherStudents />} />
          <Route path="teacher/upload" element={<TeacherUploadPdf />} />
          <Route path="teacher/upload/:fileId/progress" element={<TrainProgress />} />
          <Route path="grading" element={<TeacherGrading />} />
          <Route path="grading/:studentId" element={<StudentGrading />} />


          {/* Backwards compatibility / Redirects if needed */}
          <Route path="assignments" element={<Navigate to="/teacher/assignments" replace />} />

          {/* STUDENT */}
          <Route path="student" element={<Navigate to="/my-grades" replace />} />
          <Route path="student/assignments" element={<StudentAssignments />} />
          <Route path="my-grades" element={<StudentGrades />} />
          <Route path="schedule" element={<Schedule />} />

          {/* INDIVIDUAL */}
          <Route path="individual" element={<IndividualDashboard />} />
          <Route path="individual/quizzes" element={<IndividualQuizzes />} />
          <Route path="individual/settings" element={<IndividualSettings />} />
          {/* Reuse QuizDetails/Taking logic? Need separate or conditional logic components. For verify: basic dashboard. */}
          {/* <Route path="individual/quizzes/:quizId" element={<EditQuiz />} /> */}
          {/* <Route path="individual/quizzes/:quizId/take" element={<TakeQuiz />} /> */}
        </Route>

        <Route path="/register" element={<Register />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
