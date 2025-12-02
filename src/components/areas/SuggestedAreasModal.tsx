import { useState } from 'react';
import { X, Check, Layers } from 'lucide-react';
import Button from '../ui/Button';

interface SuggestedAreasModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (areas: { name: string; color: string }[]) => Promise<void>;
}

const SUGGESTED_AREAS = [
    { name: 'Almacén', color: '#FF5733' },
    { name: 'Calidad', color: '#33FF57' },
    { name: 'Gerencia', color: '#3357FF' },
    { name: 'Logística', color: '#FF33F6' },
    { name: 'Metal Mecánica', color: '#F6FF33' },
    { name: 'Obras Civiles', color: '#33FFF6' },
    { name: 'Oficina Técnica', color: '#9D33FF' },
    { name: 'RRHH', color: '#FF9D33' },
    { name: 'Seguridad', color: '#FF3333' },
];

export default function SuggestedAreasModal({ isOpen, onClose, onConfirm }: SuggestedAreasModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(SUGGESTED_AREAS.map(a => a.name)));

    const toggleArea = (name: string) => {
        const newSelected = new Set(selectedAreas);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelectedAreas(newSelected);
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            const areasToCreate = SUGGESTED_AREAS.filter(a => selectedAreas.has(a.name));
            await onConfirm(areasToCreate);
            onClose();
        } catch (error) {
            console.error('Error creating default areas:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Layers className="w-6 h-6 text-[#0A4D8C]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Áreas Sugeridas</h2>
                            <p className="text-sm text-gray-500">Selecciona las áreas que deseas crear para tu empresa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SUGGESTED_AREAS.map((area) => {
                            const isSelected = selectedAreas.has(area.name);
                            return (
                                <div
                                    key={area.name}
                                    onClick={() => toggleArea(area.name)}
                                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                                        ? 'border-[#0A4D8C] bg-blue-50/30'
                                        : 'border-gray-200 hover:border-gray-300 opacity-60'
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white font-bold text-xs transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50'}`}
                                        style={{ backgroundColor: area.color }}
                                    >
                                        {area.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{area.name}</h3>
                                        <p className="text-xs text-gray-500 uppercase">{area.color}</p>
                                    </div>
                                    <div className={`ml-auto transition-colors ${isSelected ? 'text-green-500' : 'text-gray-300'}`}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                    <div className="text-sm text-gray-500">
                        {selectedAreas.size} áreas seleccionadas
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleConfirm} disabled={loading || selectedAreas.size === 0}>
                            {loading ? 'Creando...' : 'Confirmar y Crear'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
