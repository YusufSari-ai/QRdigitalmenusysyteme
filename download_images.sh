#!/bin/bash

mkdir -p ~/qr-menu-proje/public/menu-images/categories
mkdir -p ~/qr-menu-proje/public/menu-images/products

echo "Downloading category images..."
docker exec -i supabase-db psql -P pager=off -U supabase_admin -d postgres -t -A -c "select image_url from categories where image_url is not null;" | while read url; do
  [ -z "$url" ] && continue
  filename=$(basename "$url")
  wget -q -O ~/qr-menu-proje/public/menu-images/categories/"$filename" "$url"
done

echo "Downloading product images..."
docker exec -i supabase-db psql -P pager=off -U supabase_admin -d postgres -t -A -c "select image_url from products where image_url is not null;" | while read url; do
  [ -z "$url" ] && continue
  filename=$(basename "$url")
  wget -q -O ~/qr-menu-proje/public/menu-images/products/"$filename" "$url"
done

echo "DONE"
