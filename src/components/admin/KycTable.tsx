import { useState } from "react";
import { Check, X, Eye, Loader2, FileText, ExternalLink, Camera, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface KycDocument {
    id: string;
    user_id: string;
    doc_type: string;
    doc_number: string;
    doc_country: string;
    doc_name: string;
    doc_image_url: string;
    selfie_url?: string;
    status: string;
    verified: boolean;
    created_at: string;
    profile: {
        full_name: string;
        email: string;
    } | null;
}

interface KycTableProps {
    kycDocuments: KycDocument[];
    onRefresh: () => void;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const KycTable = ({ kycDocuments, onRefresh }: KycTableProps) => {
    const [selectedDoc, setSelectedDoc] = useState<KycDocument | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [docToReject, setDocToReject] = useState<KycDocument | null>(null);

    const handleApprove = async (doc: KycDocument) => {
        setProcessing(doc.id);
        try {
            const { error } = await supabase
                .from("kyc_documents" as any)
                .update({
                    status: "approved",
                    verified: true,
                    verified_at: new Date().toISOString()
                })
                .eq("id", doc.id);

            if (error) throw error;

            // Send notification to worker
            await supabase.from("notifications" as any).insert({
                user_id: doc.user_id,
                title: "Conta Verificada! ✅",
                message: "Sua identidade foi validada com sucesso. Agora você pode levantar os seus fundos quando atingir o limite de saque!",
                is_read: false,
                link: "/dashboard"
            });

            toast.success("Documento aprovado com sucesso!");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao aprovar documento");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!docToReject || !rejectReason.trim()) {
            toast.error("Por favor, informe o motivo da rejeição");
            return;
        }

        setProcessing(docToReject.id);
        try {
            const { error } = await supabase
                .from("kyc_documents" as any)
                .update({
                    status: "rejected",
                    verified: false
                })
                .eq("id", docToReject.id);

            if (error) throw error;

            // Send notification to worker
            await supabase.from("notifications" as any).insert({
                user_id: docToReject.user_id,
                title: "Verificação de Identidade Rejeitada ❌",
                message: `Seu documento não foi aprovado. Motivo: ${rejectReason}`,
                is_read: false,
                link: "/dashboard/worker/settings"
            });

            toast.success("Documento rejeitado");
            setShowRejectDialog(false);
            setRejectReason("");
            setDocToReject(null);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message || "Erro ao rejeitar documento");
        } finally {
            setProcessing(null);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-AO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const pendingDocs = kycDocuments.filter(d => d.status === 'pending');
    const approvedDocs = kycDocuments.filter(d => d.status === 'approved');
    const rejectedDocs = kycDocuments.filter(d => d.status === 'rejected');

    const renderTable = (docs: KycDocument[], type: string) => {
        if (docs.length === 0) {
            return (
                <div className="card-elevated p-8 text-center bg-white/5 border-white/10 rounded-2xl">
                    <p className="text-muted-foreground uppercase font-black tracking-widest text-xs">
                        Nenhum documento {type === 'pending' ? 'pendente' : type === 'approved' ? 'aprovado' : 'rejeitado'}
                    </p>
                </div>
            );
        }

        return (
            <div className="card-elevated overflow-hidden bg-white/5 border-white/10 rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Trabalhador</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tipo</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">País</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                <th className="text-right px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {docs.map((doc) => (
                                <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-white text-sm tracking-tight">{doc.profile?.full_name || "N/A"}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight">{doc.profile?.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3 h-3 text-primary" />
                                            <span className="text-xs text-white font-bold">{doc.doc_type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">{doc.doc_country}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}
                                            className="uppercase text-[10px] font-black tracking-widest"
                                        >
                                            {doc.status === 'approved' ? 'Aprovado' : doc.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedDoc(doc)}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                                                title="Ver Documento"
                                            >
                                                <Eye className="w-4 h-4 text-primary shadow-neon" />
                                            </button>
                                            {doc.status !== 'approved' && (
                                                <button
                                                    onClick={() => handleApprove(doc)}
                                                    disabled={processing === doc.id}
                                                    className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 transition-all border border-green-500/20 disabled:opacity-50"
                                                    title="Aprovar"
                                                >
                                                    {processing === doc.id ? (
                                                        <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                                                    )}
                                                </button>
                                            )}
                                            {doc.status !== 'rejected' && (
                                                <button
                                                    onClick={() => {
                                                        setDocToReject(doc);
                                                        setShowRejectDialog(true);
                                                    }}
                                                    disabled={processing === doc.id}
                                                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50"
                                                    title="Rejeitar"
                                                >
                                                    <X className="w-4 h-4 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <>
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 p-1 h-auto rounded-xl mb-4">
                    <TabsTrigger value="pending" className="py-2.5 text-xs font-black uppercase tracking-widest">
                        Pendentes
                        {pendingDocs.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[9px]">{pendingDocs.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="py-2.5 text-xs font-black uppercase tracking-widest">
                        Aprovados
                        {approvedDocs.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded text-[9px]">{approvedDocs.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="py-2.5 text-xs font-black uppercase tracking-widest">
                        Rejeitados
                        {rejectedDocs.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded text-[9px]">{rejectedDocs.length}</span>}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    {renderTable(pendingDocs, 'pending')}
                </TabsContent>
                <TabsContent value="approved">
                    {renderTable(approvedDocs, 'approved')}
                </TabsContent>
                <TabsContent value="rejected">
                    {renderTable(rejectedDocs, 'rejected')}
                </TabsContent>
            </Tabs>
            {/* Details Dialog */}
            <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
                <DialogContent className="max-w-3xl bg-background border-white/10 backdrop-blur-3xl overflow-hidden rounded-3xl shadow-neon">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-black text-white uppercase tracking-widest">
                            Garantia de Identidade
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            Análise técnica de documento oficial
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDoc && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Candidato</p>
                                    <p className="font-bold text-white text-sm">{selectedDoc.profile?.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Email Oficial</p>
                                    <p className="font-bold text-white text-sm">{selectedDoc.profile?.email}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tipo de Título</p>
                                    <p className="font-black text-primary text-sm uppercase">{selectedDoc.doc_type}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Número Registrado</p>
                                    <p className="font-mono text-sm text-white font-bold tracking-widest">{selectedDoc.doc_number}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Jurisdição</p>
                                    <p className="font-bold text-white text-sm tracking-tight">{selectedDoc.doc_country}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Protocolo Envio</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{formatDate(selectedDoc.created_at)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Comparação Visual · Documento vs Selfie</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Document Image */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                                <FileText className="w-3 h-3" /> Documento Oficial
                                            </p>
                                            {selectedDoc.doc_image_url && (
                                                <a
                                                    href={selectedDoc.doc_image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[8px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                                                >
                                                    Abrir <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="relative aspect-[4/3] flex items-center justify-center bg-black/50 border border-white/5 rounded-2xl overflow-hidden group shadow-inner">
                                            {selectedDoc.doc_image_url ? (
                                                <img
                                                    src={selectedDoc.doc_image_url}
                                                    alt="Documento"
                                                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="text-center p-8">
                                                    <FileText className="w-12 h-12 text-white/10 mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Imagem não disponível</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selfie Image */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black text-gold uppercase tracking-widest flex items-center gap-1.5">
                                                <Camera className="w-3 h-3" /> Selfie de Verificação
                                            </p>
                                            {selectedDoc.selfie_url && (
                                                <a
                                                    href={selectedDoc.selfie_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[8px] font-black text-muted-foreground uppercase tracking-widest hover:text-gold transition-colors"
                                                >
                                                    Abrir <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="relative aspect-[4/3] flex items-center justify-center bg-black/50 border border-white/5 rounded-2xl overflow-hidden group shadow-inner">
                                            {selectedDoc.selfie_url ? (
                                                <img
                                                    src={selectedDoc.selfie_url}
                                                    alt="Selfie"
                                                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="text-center p-8">
                                                    <User className="w-12 h-12 text-white/10 mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Selfie não enviada</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedDoc(null)}
                                    className="rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] px-8"
                                >
                                    Fechar Análise
                                </Button>
                                <Button
                                    onClick={() => handleApprove(selectedDoc)}
                                    disabled={processing !== null}
                                    className="rounded-xl bg-primary text-primary-foreground hover:shadow-neon transition-all font-black uppercase tracking-widest text-[10px] px-10"
                                >
                                    {processing === selectedDoc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validar Agora"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="bg-background border-white/10 backdrop-blur-3xl rounded-3xl shadow-neon">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-black text-red-500 uppercase tracking-widest">
                            Rejeitar Verificação
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Fundamentação da negativa técnica
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <Textarea
                            placeholder="Ex: Documento ilegível, nome não coincide com o perfil, documento fora da validade..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={4}
                            className="bg-white/5 border-white/10 rounded-2xl focus:ring-red-500/50 transition-all font-medium text-sm p-4"
                        />
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectDialog(false)}
                                className="rounded-xl border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] px-6"
                            >
                                Manter em Aberto
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={processing !== null}
                                className="rounded-xl bg-red-500 hover:bg-red-600 transition-all font-black uppercase tracking-widest text-[10px] px-10 shadow-lg shadow-red-500/20"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Rejeição"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default KycTable;
