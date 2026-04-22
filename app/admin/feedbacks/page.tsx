"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type FeedbackRow = {
    id: number;
    rating: string;
    comment: string | null;
    created_at: string;
};

export default function AdminFeedbacksPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

    const loadFeedbacks = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/feedbacks", { cache: "no-store" });
            const data = await res.json();
            setFeedbacks(data.feedbacks ?? []);
        } catch (error) {
            console.error(error);
            setFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            setDeletingId(id);

            const res = await fetch(`/api/feedback?id=${id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || "Silme başarısız.");
            }

            setFeedbacks((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error(error);
            alert("Geri bildirim silinemedi.");
        } finally {
            setDeletingId(null);
        }
    };

    const positiveCount = feedbacks.filter((item) => item.rating === "👍").length;
    const neutralCount = feedbacks.filter((item) => item.rating === "😐").length;
    const negativeCount = feedbacks.filter((item) => item.rating === "👎").length;

    return (
        <AdminLayout title="Geri Bildirimler">
            {deleteTarget && (
                <ConfirmDialog
                    title="Geri bildirim silinsin mi?"
                    message="Bu işlem geri alınamaz."
                    confirmLabel={deletingId === deleteTarget ? "Siliniyor…" : "Evet, sil"}
                    onConfirm={async () => {
                        await handleDelete(deleteTarget);
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            <div className="admin-page-header">
                <div>
                    <h2 className="admin-page-title">Geri Bildirimler</h2>
                    <p className="admin-page-subtitle">
                        {feedbacks.length} geri bildirim
                    </p>
                </div>
            </div>

            <section className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-card__value">{feedbacks.length}</div>
                    <div className="admin-stat-card__label">Toplam Geri Bildirim</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-card__value">{positiveCount}</div>
                    <div className="admin-stat-card__label">Olumlu</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-card__value">{neutralCount}</div>
                    <div className="admin-stat-card__label">Nötr</div>
                </div>

                <div className="admin-stat-card">
                    <div className="admin-stat-card__value">{negativeCount}</div>
                    <div className="admin-stat-card__label">Olumsuz</div>
                </div>
            </section>

            <section className="admin-card">
                <div className="admin-card__header">
                    <div>
                        <h3 className="admin-card__title">Tüm Geri Bildirimler</h3>
                        <p className="admin-card__subtitle">
                            Son 30 gün içindeki müşteri değerlendirmeleri
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        <p>Yükleniyor…</p>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="admin-empty-state">
                        <h4>Henüz geri bildirim yok</h4>
                        <p>Yeni yorumlar geldiğinde burada görünecek.</p>
                    </div>
                ) : (
                    <div className="feedback-list">
                        {feedbacks.map((item) => (
                            <div key={item.id} className="feedback-item">
                                <div className="feedback-item__top">
                                    <div className="feedback-item__rating">{item.rating}</div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                        }}
                                    >
                                        <div className="feedback-item__date">
                                            {new Date(item.created_at).toLocaleString("tr-TR")}
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => setDeleteTarget(item.id)}
                                            disabled={deletingId === item.id}
                                        >
                                            {deletingId === item.id ? "Siliniyor…" : "Sil"}
                                        </button>
                                    </div>
                                </div>

                                <div className="feedback-item__comment">
                                    {item.comment?.trim() ? item.comment : "Yorum bırakılmadı."}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}