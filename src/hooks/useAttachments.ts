import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Attachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export function useAttachments(ticketId: string) {
  return useQuery({
    queryKey: ["attachments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!ticketId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      file,
    }: {
      ticketId: string;
      file: File;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Create unique file path: userId/ticketId/timestamp_filename
      const timestamp = Date.now();
      const filePath = `${user.id}/${ticketId}/${timestamp}_${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from("attachments")
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", variables.ticketId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ticketId,
      filePath,
    }: {
      id: string;
      ticketId: string;
      filePath: string;
    }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("ticket-attachments")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete attachment record
      const { error } = await supabase
        .from("attachments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", variables.ticketId] });
    },
  });
}

export async function getAttachmentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    console.error("Failed to get signed URL:", error);
    return "";
  }
  return data.signedUrl;
}
