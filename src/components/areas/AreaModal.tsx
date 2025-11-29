import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { Area } from '../../data/mockData';

interface AreaModalProps {
    isOpen: boolean;
    onClose: () => void;
    areaToEdit?: Area | null;
    onSave: (name: string, color: string) => Promise<void>;
}

export default function AreaModal({ isOpen, onClose, areaToEdit, onSave }: AreaModalProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#000000');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (areaToEdit) {
            setName(areaToEdit.name);
            setColor(areaToEdit.color);
        } else {
            setName('');
            setColor('#0A4D8C'); // Default color
        }
    }, [areaToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setLoading(true);
            await onSave(name, color);
            onClose();
        } catch (error) {
            console.error('Error saving area:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {areaToEdit ? 'Editar Área' : 'Nueva Área'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Área
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0A4D8C] focus:border-transparent"
                            placeholder="Ej: Finanzas"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color Identificativo
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-20 p-1 border border-gray-300 rounded-md cursor-pointer"
                            />
                            <span className="text-sm text-gray-500">{color}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
