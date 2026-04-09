#!/bin/bash

echo "Downloading category images..."
docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c "select image_url from categories;" | while read url; do
  filename=$(basename "$url")
  wget -q -O ~/qr-menu-proje/public/menu-images/categories/$filename "$url"
done

echo "Downloading product images..."
docker exec -i supabase-db psql -U supabase_admin -d postgres -t -A -c "select image_url from products;" | while read url; do
  filename=$(basename "$url")
  wget -q -O ~/qr-menu-proje/public/menu-images/products/$filename "$url"
done

echo "DONE"
