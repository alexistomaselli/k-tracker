import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useProjects } from '../hooks/useData';

export default function Projects() {
  const navigate = useNavigate();
  const { projects, loading, error, createProject } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    status: 'active',
    start_date: new Date().toISOString().slice(0, 10),
    estimated_end_date: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().slice(0, 10);
    })(),
    budget: '' as any,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activo',
      completed: 'Completado',
      on_hold: 'En Espera',
    };
    return labels[status] || status;
  };

  function openModal() {
    setSubmitError(null);
    setIsOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.name || !form.code) {
      setSubmitError('Completa nombre y código');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        status: form.status as any,
        start_date: form.start_date,
        estimated_end_date: form.estimated_end_date,
        budget: form.budget ? Number(form.budget) : undefined,
      };
      const created = await createProject(payload);
      setIsOpen(false);
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Error al crear proyecto');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Error al cargar proyectos: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando proyectos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600 mt-1">Gestiona tus proyectos de construcción</p>
        </div>
        <Button variant="primary" onClick={openModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
            <div className="w-full sm:flex-1 sm:min-w-[420px]">
              <SearchInput
                placeholder="Buscar proyectos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'active', label: 'Activos' },
                { value: 'completed', label: 'Completados' },
                { value: 'on_hold', label: 'En Espera' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-48"
            />
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron proyectos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600">{project.code}</p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'active' : 'pending'}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Inicio:</span>
                          <span className="font-medium">{project.start_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fin estimado:</span>
                          <span className="font-medium">{project.estimated_end_date}</span>
                        </div>
                        {project.budget && (
                          <div className="flex justify-between">
                            <span>Presupuesto:</span>
                            <span className="font-medium">
                              ${project.budget.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nuevo Proyecto" size="lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" placeholder="Nombre del proyecto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Código" placeholder="Ej: PRJ-001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[
              { value: 'active', label: 'Activo' },
              { value: 'completed', label: 'Completado' },
              { value: 'on_hold', label: 'En Espera' },
            ]} />
            <Input label="Presupuesto" type="number" placeholder="Opcional" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <Input label="Inicio" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="Fin estimado" type="date" value={form.estimated_end_date} onChange={(e) => setForm({ ...form, estimated_end_date: e.target.value })} />
          </div>
          {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Creando...' : 'Crear Proyecto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
