import LoadingSpinner from './LoadingSpinner';
import '../styles/style.css';


export const GlobalLoader = () => (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size={48} />
    </div>
  );

export const AbsoluteLoader = () => (
  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-50 rounded-[inherit]">
    <LoadingSpinner size={48} />
  </div>
);

export const LocalLoader = () => (
  <div className="flex justify-center items-center py-10 w-full">
    <LoadingSpinner size={36} />
  </div>
);