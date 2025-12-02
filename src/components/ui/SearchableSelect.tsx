import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    description?: string;
    badge?: {
        text: string;
        color: string;
    };
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    className = '',
    disabled = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                // Check if click is inside the portal dropdown
                const dropdown = document.getElementById('searchable-select-dropdown');
                if (dropdown && dropdown.contains(event.target as Node)) {
                    return;
                }
                setIsOpen(false);
            }
        }

        function updatePosition() {
            if (isOpen && wrapperRef.current) {
                const rect = wrapperRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        if (isOpen) {
            updatePosition();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white flex items-center justify-between cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
                    } ${isOpen ? 'ring-2 ring-[#0A4D8C] border-[#0A4D8C]' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
                    {selectedOption ? (
                        <>
                            <div className="flex items-center gap-2">
                                <span>{selectedOption.label}</span>
                                {selectedOption.badge && (
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                        style={{ backgroundColor: selectedOption.badge.color }}
                                    >
                                        {selectedOption.badge.text}
                                    </span>
                                )}
                            </div>
                            {selectedOption.description && (
                                <span className="ml-2 text-gray-400 text-xs">
                                    {selectedOption.description}
                                </span>
                            )}
                        </>
                    ) : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {selectedOption && !disabled && (
                        <div
                            onClick={clearSelection}
                            className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && createPortal(
                <div
                    id="searchable-select-dropdown"
                    className="absolute z-[9999] bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
                    style={{
                        top: `${dropdownPosition.top + 4}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                    }}
                >
                    <div className="sticky top-0 p-2 bg-white border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#0A4D8C]"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${option.value === value ? 'bg-blue-50 text-[#0A4D8C] font-medium' : 'text-gray-700'
                                        }`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{option.label}</span>
                                        {option.badge && (
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                                style={{ backgroundColor: option.badge.color }}
                                            >
                                                {option.badge.text}
                                            </span>
                                        )}
                                    </div>
                                    {option.description && (
                                        <span className="ml-2 text-gray-500 text-xs">
                                            {option.description}
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
