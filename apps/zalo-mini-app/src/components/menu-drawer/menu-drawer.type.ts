export interface IMenuDrawerComponentProps {
    isOpen: boolean;
    onClose: () => void;
    setSelectedCategory: (category: string | null) => void;
}