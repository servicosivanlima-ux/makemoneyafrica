import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, CheckCircle, Loader2, Image as ImageIcon, FileText } from "lucide-react";

interface FileUploadProps {
  userId: string;
  taskId?: string; // Optional for campaign payments
  proofType: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
  allowedTypes?: string[];
}

const FileUpload = ({
  userId,
  taskId,
  proofType,
  label,
  required = false,
  value,
  onChange,
  allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"],
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB");
      return;
    }

    // Show preview if image
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const prefix = taskId ? `${taskId}_` : "";
      const fileName = `${userId}/${prefix}${proofType}_${timestamp}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("task-proofs")
        .upload(fileName, file, {
          cacheControl: "345600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("task-proofs")
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo. Tente novamente.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        // Extract file path from URL
        const url = new URL(value);
        const pathParts = url.pathname.split("/task-proofs/");
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          await supabase.storage.from("task-proofs").remove([filePath]);
        }
      } catch (err) {
        console.error("Error removing file:", err);
      }
    }
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isImage = value && (value.match(/\.(jpeg|jpg|gif|png)$/i) || preview);
  const isPdf = value && value.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>

      <input
        type="file"
        ref={fileInputRef}
        accept={allowedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/50">
          {isImage ? (
            <img
              src={preview || value}
              alt={`Preview ${proofType}`}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex flex-col items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              <span className="text-xs font-mono truncate max-w-[200px]">
                {value.split("/").pop()}
              </span>
            </div>
          )}

          {uploading ? (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Enviado
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="p-3 rounded-full bg-muted">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Clique para enviar
                </p>
                <p className="text-xs text-muted-foreground">
                  Imagens ou PDF (máx. 5MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default FileUpload;
