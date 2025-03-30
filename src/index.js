import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamScheduler from './App';
import ListOfStudentsCRN from './components/ListOfStudentsCRN';
import SubjectList from './components/SubjectList';
import CreateExamPage from './components/CreateExamPage';
import ManagePredSubjectList from './components/ManagePredSubjectList';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

const el = document.getElementById('root');
const root = ReactDOM.createRoot(el);

root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Защищённые маршруты */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <ExamScheduler />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/subjects"
                element={
                    <ProtectedRoute>
                        <SubjectList />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/section/:sectionId"
                element={
                    <ProtectedRoute>
                        <ListOfStudentsCRN />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/create-exam"
                element={
                    <ProtectedRoute>
                        <CreateExamPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manage-subject-list"
                element={
                    <ProtectedRoute>
                        <ManagePredSubjectList />
                    </ProtectedRoute>
                }
            />
        </Routes>
    </BrowserRouter>
);