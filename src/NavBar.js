import React from 'react';
import { Download, Filter, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onResetFilters, showFilterButton = true }) => {
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-lg bg-red text-white py-3 shadow-sm" style={{ backgroundColor: '#C8102E' }}>
      <div className="container">
        <h1 className="navbar-brand mb-0 h2 text-white">NARXOZ UNIVERSITY</h1>
        <div className="d-flex gap-3 align-items-center">
          {showFilterButton && (
            <button
              onClick={onResetFilters}
              className="btn btn-outline-light d-flex align-items-center gap-2"
            >
              <Filter size={20} />
              <span>Сбросить фильтры</span>
            </button>
          )}
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