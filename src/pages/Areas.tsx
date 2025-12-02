import { useState } from 'react';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import AreaModal from '../components/areas/AreaModal';
import SuggestedAreasModal from '../components/areas/SuggestedAreasModal';
import { useAreas, useAreaActions } from '../hooks/useData';
import { Area } from '../data/mockData';
import { useToast } from '../context/ToastContext';

export default function Areas() {
    const { areas, loading, error, reloadAreas } = useAreas();
    const { createArea, updateArea, deleteArea, createDefaultAreas } = useAreaActions();

    const toast = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSuggestedModalOpen, setIsSuggestedModalOpen] = useState(false);
    const [areaToEdit, setAreaToEdit] = useState<Area | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleCreate = () => {
        setAreaToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (area: Area) => {
        setAreaToEdit(area);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar esta área?')) {
            try {
                setActionLoading(true);
                await deleteArea(id);
                await reloadAreas();
                toast.success('Área eliminada correctamente');
            } catch (err) {
                console.error('Error deleting area:', err);
                toast.error('Error al eliminar el área');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleSave = async (name: string, color: string) => {
        try {
            if (areaToEdit) {
                await updateArea(areaToEdit.id, name, color);
                toast.success('Área actualizada correctamente');
            } else {
                await createArea(name, color);
                toast.success('Área creada correctamente');
            }
            await reloadAreas();
        } catch (err) {
            console.error('Error saving area:', err);
            toast.error('Error al guardar el área');
            throw err;
        }
    };

    const handleCreateDefaults = async (selectedAreas?: { name: string; color: string }[]) => {
        try {
            await createDefaultAreas(selectedAreas);
            await reloadAreas();
            toast.success('Áreas sugeridas creadas correctamente');
        } catch (err) {
            console.error('Error creating default areas:', err);
            toast.error('Error al crear áreas sugeridas');
            throw err;
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando áreas...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Áreas</h1>
                    <p className="text-gray-600 mt-1">Administra las áreas y departamentos de la empresa</p>
                </div>
                <div className="flex gap-3">
                    {areas.length === 0 && (
                        <Button variant="outline" onClick={() => setIsSuggestedModalOpen(true)} disabled={actionLoading}>
                            <Layers className="w-4 h-4 mr-2" />
                            Cargar Sugeridas
                        </Button>
                    )}
                    <Button variant="primary" onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Área
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {areas.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Layers className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay áreas registradas</h3>
                            <p className="text-gray-500 mb-6">Comienza creando las áreas de tu empresa o carga las sugeridas.</p>
                            <Button variant="primary" onClick={() => setIsSuggestedModalOpen(true)} disabled={actionLoading}>
                                Cargar Áreas Sugeridas
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Color</th>
                                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {areas.map((area) => (
                                        <tr key={area.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium text-gray-900">{area.name}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded border border-gray-200"
                                                        style={{ backgroundColor: area.color }}
                                                    />
                                                    <span className="text-sm text-gray-500 uppercase">{area.color}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(area)}
                                                        className="p-1 text-gray-400 hover:text-[#0A4D8C] transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(area.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AreaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                areaToEdit={areaToEdit}
                onSave={handleSave}
            />

            <SuggestedAreasModal
                isOpen={isSuggestedModalOpen}
                onClose={() => setIsSuggestedModalOpen(false)}
                onConfirm={handleCreateDefaults}
            />
        </div>
    );
}
