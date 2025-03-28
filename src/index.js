import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamScheduler from './App';
import ListOfStudentsCRN from './components/ListOfStudentsCRN';
import SubjectList from './components/SubjectList';
import CreateExamPage from './components/CreateExamPage';
import ManagePredSubjectList from './components/ManagePredSubjectList';

const el = document.getElementById('root');
const root = ReactDOM.createRoot(el);

root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<ExamScheduler />} />
            <Route path="/subjects" element={<SubjectList />} />
            <Route path="/section/:sectionId" element={<ListOfStudentsCRN />} />
            <Route path="/create-exam" element={< CreateExamPage/>}/>
            <Route path="/manage-subject-list" element={< ManagePredSubjectList/>}/>
        </Routes>
    </BrowserRouter>
);