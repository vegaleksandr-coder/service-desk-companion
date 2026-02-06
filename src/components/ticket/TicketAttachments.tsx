import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
  getAttachmentUrl,
} from "@/hooks/useAttachments";
import { useAuth } from "@/contexts/AuthContext";
import {
  Paperclip,
  Upload,
  Loader2,
  FileIcon,
  ImageIcon,
  FileTextIcon,
  Trash2,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface TicketAttachmentsProps {
  ticketId: string;
  canUpload: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) {
    return <FileTextIcon className="h-4 w-4" />;
  }
  return <FileIcon className="h-4 w-4" />;
}

export function TicketAttachments({ ticketId, canUpload }: TicketAttachmentsProps) {
  const { user, role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<{ id: string; filePath: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: attachments, isLoading } = useAttachments(ticketId);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const isStaff = role === "admin" || role === "executor";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Файл слишком большой. Максимальный размер: 10 МБ");
      return;
    }

    try {
      await uploadAttachment.mutateAsync({ ticketId, file });
      toast.success("Файл загружен");
    } catch (error) {
      toast.error("Ошибка при загрузке файла");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteAttachment.mutateAsync({
        id: deleteId.id,
        ticketId,
        filePath: deleteId.filePath,
      });
      toast.success("Файл удален");
    } catch (error) {
      toast.error("Ошибка при удалении файла");
    }
    setDeleteId(null);
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const url = getAttachmentUrl(filePath);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (filePath: string, mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      setPreviewUrl(getAttachmentUrl(filePath));
    } else {
      // For non-images, open in new tab
      window.open(getAttachmentUrl(filePath), "_blank");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Вложения ({attachments?.length || 0})
            </CardTitle>
            {(canUpload || isStaff) && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAttachment.isPending}
                >
                  {uploadAttachment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Загрузить</span>
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attachments && attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 rounded-md border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="shrink-0 text-muted-foreground">
                    {getFileIcon(attachment.mime_type)}
                  </div>
                  
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => handlePreview(attachment.file_path, attachment.mime_type)}
                  >
                    <p className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {" "}
                      {formatDistanceToNow(new Date(attachment.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </button>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(attachment.file_path, attachment.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {(user?.id === attachment.uploaded_by || isStaff) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteId({ id: attachment.id, filePath: attachment.file_path })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет вложений
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить файл?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Файл будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
