import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { authHeaders } from '../utils/authHeaders';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';

const AssignProctorModal = ({ show, onClose }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFileName(selected.name);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Пожалуйста, выберите файл с прокторами');
      return;
    }

    const formData = new FormData();
    formData.append('proctors', file);

    try {
      setIsLoading(true);

      const response = await fetch('http://localhost:5000/api/proctors/assign', {
        ...authHeaders(),
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Прокторы успешно назначены');
        onClose();
      } else {
        toast.error(data.error || 'Произошла ошибка при назначении прокторов');
      }
    } catch (error) {
      console.error('Ошибка при назначении прокторов:', error);
      toast.error('Произошла ошибка при назначении прокторов');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-[#C8102E] px-6 py-4">
          <DialogTitle className="text-white text-lg font-semibold">Назначить прокторов</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-3">
          <label className="text-sm font-medium text-gray-700 block">
            Загрузить файл с прокторами (.xlsx)
          </label>

          <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${fileName
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-gray-200 bg-gray-50 hover:border-[#C8102E] hover:bg-[#FFF5F5]'
            }`}
          >
            {fileName
              ? <FileText size={22} className="text-emerald-600 shrink-0" />
              : <UploadCloud size={22} className="text-gray-400 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <span className={`text-sm block truncate ${fileName ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                {fileName || 'Нажмите чтобы выбрать файл...'}
              </span>
              {!fileName && (
                <span className="text-xs text-gray-400">Поддерживаются .xlsx, .xls</span>
              )}
            </div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !file}
            className="bg-[#C8102E] hover:bg-[#A00D26] text-white rounded-xl shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Назначение...
              </>
            ) : (
              'Назначить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignProctorModal;
