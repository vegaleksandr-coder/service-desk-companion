import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTicket } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TicketDeleteDialogProps {
  ticketId: string;
  ticketTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDeleteDialog({
  ticketId,
  ticketTitle,
  open,
  onOpenChange,
}: TicketDeleteDialogProps) {
  const navigate = useNavigate();
  const deleteTicket = useDeleteTicket();

  const handleDelete = async () => {
    try {
      await deleteTicket.mutateAsync(ticketId);
      toast.success("Заявка удалена");
      navigate("/tickets");
    } catch (error) {
      toast.error("Ошибка при удалении заявки");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить заявку "{ticketTitle}"? Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteTicket.isPending}
          >
            {deleteTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}