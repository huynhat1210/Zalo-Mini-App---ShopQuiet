export interface IEditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  zaloUser: any;
  updateZaloUser: (user: any) => void;
  showToast: (message: string, type: 'success' | 'warning' | 'info') => void;
}
