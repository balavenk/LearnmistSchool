import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Schools from './pages/super-admin/Schools';
import SchoolAdminDashboard from './pages/SchoolAdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
// import Settings from './pages/super-admin/Settings';
import UserManagement from './pages/super-admin/UserManagement';

// School Admin Pages
import TeachersList from './pages/school-admin/TeachersList';
import StudentsList from './pages/school-admin/StudentsList';
import SubjectsList from './pages/school-admin/SubjectsList';
import GradesList from './pages/school-admin/GradesList';
import QuestionBank from './pages/school-admin/QuestionBank';
import QuestionBankDetails from './pages/school-admin/QuestionBankDetails';
import Classes from './pages/Classes';
import TeacherAssignments from './pages/TeacherAssignments';
import StudentAssignments from './pages/StudentAssignments';


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
          {/* SCHOOL ADMIN */}
          <Route path="school-admin" element={<SchoolAdminDashboard />} />
          <Route path="school-admin/teachers" element={<TeachersList />} />
          <Route path="school-admin/students" element={<StudentsList />} />
          <Route path="school-admin/subjects" element={<SubjectsList />} />
          <Route path="school-admin/grades" element={<GradesList />} />
          <Route path="school-admin/question-bank" element={<QuestionBank />} />
          <Route path="school-admin/question-bank/:gradeId" element={<QuestionBankDetails />} />

          {/* TEACHER & STUDENT */}
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/assignments" element={<StudentAssignments />} />

          {/* SHARED */}
          <Route path="classes" element={<Classes />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
