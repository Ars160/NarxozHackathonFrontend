import React from 'react';
import { List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const Navbar = () => {
  const navigate = useNavigate();
  

  return (
    <nav className="navbar navbar-expand-lg bg-red text-white py-3 shadow-sm" style={{ backgroundColor: '#C8102E' }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="container">
        <h1 className="navbar-brand mb-0 h2 text-white">NARXOZ UNIVERSITY</h1>
        <div className="d-flex gap-3 align-items-center">
          <button
            onClick={() => navigate('/subjects/')}
            className="btn btn-light text-red d-flex align-items-center gap-2"
            style={{ color: '#C8102E' }}
          >
            <List size={20} />
            <span>Предметы</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;