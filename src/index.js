import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamScheduler from './App';
import ListOfStudentsCRN from './ListOfStudentsCRN';
import SubjectList from './SubjectList';

const el = document.getElementById('root');
const root = ReactDOM.createRoot(el);

root.render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<ExamScheduler />} />
            <Route path="/subjects" element={<SubjectList />} />
            <Route path="/section/:sectionId" element={<ListOfStudentsCRN />} />
            
        </Routes>
    </BrowserRouter>
);