"use client";

import { useState, useEffect } from "react";
import ImageUploader from "./ImageUploader";
import { adminCreateCategory, adminUpdateCategory } from "@/lib/queries";
import type { Category, CardType } from "@/types/category";

interface CategoryFormProps {
  editTarget?: Category | null;
  nextOrderIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  image_url?: string;
}

export default function CategoryForm({
  editTarget,
  nextOrderIndex,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const isEdit = !!editTarget;

  const [name, setName] = useState(editTarget?.name ?? "");
  const [imageUrl, setImageUrl] = useState(editTarget?.image_url ?? "");
  const [orderIndex, setOrderIndex] = useState(
    editTarget?.orderIndex ?? nextOrderIndex
  );
  const [cardType, setCardType] = useState<CardType>(
    editTarget?.card_type ?? "vertical"
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Re-populate when editTarget changes
  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name);
      setImageUrl(editTarget.image_url);
      setOrderIndex(editTarget.orderIndex);
      setCardType(editTarget.card_type ?? "vertical");
    }
  }, [editTarget]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    // Spec §7.2: names MUST NOT be empty
    if (!name.trim()) errs.name = "Category name is required.";
    // Spec §7.2: image upload MUST be mandatory
    if (!imageUrl) errs.image_url = "An image is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      image_url: imageUrl,
      orderIndex,
      card_type: cardType,
    };

    const { error } = isEdit
      ? await adminUpdateCategory(editTarget!.id, payload)
      : await adminCreateCategory(payload);

    setSubmitting(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    onSuccess();
  };

  return (
    <form
      className="form-wrap"
      onSubmit={handleSubmit}
      noValidate
      id="category-form"
    >
      <div className="form-grid">
        {/* Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="category-name">
            Category Name <span>*</span>
          </label>
          <input
            id="category-name"
            type="text"
            className={`form-input${errors.name ? " error" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Starters"
            maxLength={100}
            autoComplete="off"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        {/* Order */}
        <div className="form-group">
          <label className="form-label" htmlFor="category-order">
            Display Order
          </label>
          <input
            id="category-order"
            type="number"
            className="form-input"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            min={0}
          />
          <p className="form-hint">Lower numbers appear first.</p>
        </div>

        {/* Card Type */}
        <div className="form-group">
          <label className="form-label" htmlFor="category-card-type">
            Card Style
          </label>
          <select
            id="category-card-type"
            className="form-input"
            value={cardType}
            onChange={(e) => setCardType(e.target.value as CardType)}
          >
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
          <p className="form-hint">Controls how this category appears in the menu grid.</p>
        </div>

        {/* Image */}
        <div className="form-group">
          <label className="form-label">
            Image <span>*</span>
          </label>
          <ImageUploader
            folder="categories"
            initialUrl={editTarget?.image_url}
            onUpload={(url) => {
              setImageUrl(url);
              setErrors((e) => ({ ...e, image_url: undefined }));
            }}
            onClear={() => setImageUrl("")}
            error={errors.image_url}
            id="category-image-uploader"
          />
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={submitting}
            id="category-form-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="category-form-submit"
          >
            {submitting && <span className="spinner" />}
            {isEdit ? "Save changes" : "Create category"}
          </button>
        </div>
      </div>
    </form>
  );
}
