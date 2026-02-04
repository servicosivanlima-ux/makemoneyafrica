import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, CheckCircle, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  userId: string;
  taskId: string;
  proofType: "follow" | "like" | "comment" | "share";
  label: string;
  required?: boolean;
  value: string;
  onChange: (url: string) => void;
}

const ImageUpload = ({
  userId,
  taskId,
  proofType,
  label,
  required = false,
  value,
  onChange,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Apenas imagens JPG ou PNG são permitidas");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${taskId}_${proofType}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("task-proofs")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("task-proofs")
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem. Tente novamente.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      // Extract file path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split("/task-proofs/");
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from("task-proofs").remove([filePath]);
      }
    }
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayImage = preview || value;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayImage ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/50">
          <img
            src={displayImage}
            alt={`Preview ${proofType}`}
            className="w-full h-32 object-cover"
          />
          {uploading ? (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {value && (
                <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Enviado
                </div>
              )}
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
                  JPG ou PNG (máx. 5MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
