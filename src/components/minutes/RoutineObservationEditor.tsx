import { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Save } from 'lucide-react';

interface RoutineObservationEditorProps {
    initialNotes: string;
    onSave: (notes: string) => void;
}

export default function RoutineObservationEditor({ initialNotes, onSave }: RoutineObservationEditorProps) {
    const [notes, setNotes] = useState(initialNotes);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setNotes(initialNotes);
        setIsDirty(false);
    }, [initialNotes]);

    const handleSave = () => {
        onSave(notes);
        setIsDirty(false);
    };

    return (
        <div className="flex gap-2 items-center">
            <Input
                value={notes}
                onChange={(e) => {
                    setNotes(e.target.value);
                    setIsDirty(true);
                }}
                placeholder="Agregar observación..."
                className="text-sm"
            />
            {isDirty && (
                <Button
                    onClick={handleSave}
                    size="sm"
                    variant="ghost"
                    className="p-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                    title="Guardar observación"
                >
                    <Save size={16} />
                </Button>
            )}
        </div>
    );
}
