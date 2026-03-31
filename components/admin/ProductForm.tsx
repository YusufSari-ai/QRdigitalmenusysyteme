"use client";

import { useState, useEffect } from "react";
import ImageUploader from "./ImageUploader";
import { adminCreateProduct, adminUpdateProduct } from "@/lib/queries";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

interface ProductFormProps {
  editTarget?: Product | null;
  categories: Category[];
  nextOrderIndex: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  price?: string;
  categoryId?: string;
  image_url?: string;
}

export default function ProductForm({
  editTarget,
  categories,
  nextOrderIndex,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const isEdit = !!editTarget;

  const [name, setName] = useState(editTarget?.name ?? "");
  const [price, setPrice] = useState(
    editTarget ? String(editTarget.price) : ""
  );
  const [categoryId, setCategoryId] = useState(editTarget?.categoryId ?? "");
  const [imageUrl, setImageUrl] = useState(editTarget?.image_url ?? "");
  const [orderIndex, setOrderIndex] = useState(
    editTarget?.orderIndex ?? nextOrderIndex
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name);
      setPrice(String(editTarget.price));
      setCategoryId(editTarget.categoryId);
      setImageUrl(editTarget.image_url);
      setOrderIndex(editTarget.orderIndex);
    }
  }, [editTarget]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    // Spec §7.2
    if (!name.trim()) errs.name = "Product name is required.";
    const parsedPrice = parseFloat(price);
    if (price === "" || isNaN(parsedPrice))
      errs.price = "A valid price is required.";
    else if (parsedPrice < 0)
      // Spec §4.1, §7.2: price MUST NOT be negative
      errs.price = "Price must not be negative.";
    if (!categoryId) errs.categoryId = "Please select a category.";
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
      price: parseFloat(parseFloat(price).toFixed(2)),
      categoryId,
      orderIndex,
    };

    const { error } = isEdit
      ? await adminUpdateProduct(editTarget!.id, payload)
      : await adminCreateProduct(payload);

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
      id="product-form"
    >
      <div className="form-grid">
        {/* Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="product-name">
            Product Name <span>*</span>
          </label>
          <input
            id="product-name"
            type="text"
            className={`form-input${errors.name ? " error" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grilled Salmon"
            maxLength={150}
            autoComplete="off"
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label" htmlFor="product-price">
            Price (₺) <span>*</span>
          </label>
          <input
            id="product-price"
            type="number"
            className={`form-input${errors.price ? " error" : ""}`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          {errors.price && <p className="form-error">{errors.price}</p>}
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label" htmlFor="product-category">
            Category <span>*</span>
          </label>
          <select
            id="product-category"
            className={`form-select${errors.categoryId ? " error" : ""}`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select a category…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="form-error">{errors.categoryId}</p>
          )}
        </div>

        {/* Order */}
        <div className="form-group">
          <label className="form-label" htmlFor="product-order">
            Display Order
          </label>
          <input
            id="product-order"
            type="number"
            className="form-input"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
            min={0}
          />
        </div>

        {/* Image */}
        <div className="form-group">
          <label className="form-label">
            Image <span>*</span>
          </label>
          <ImageUploader
            folder="products"
            initialUrl={editTarget?.image_url}
            onUpload={(url) => {
              setImageUrl(url);
              setErrors((e) => ({ ...e, image_url: undefined }));
            }}
            onClear={() => setImageUrl("")}
            error={errors.image_url}
            id="product-image-uploader"
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
            id="product-form-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="product-form-submit"
          >
            {submitting && <span className="spinner" />}
            {isEdit ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </form>
  );
}
