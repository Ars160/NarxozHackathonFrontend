const LoadingSpinner = ({ color = '#C8102E' }) => (
    <div className="spinner-border text-red" role="status" style={{ color }}>
      <span className="visually-hidden">Загрузка...</span>
    </div>
  );

export default LoadingSpinner;
