const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = 'https://poswtkarskyouacsjfct.supabase.co';
let serviceRoleKey = '';

try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.split('=')[1].trim();
    } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceRoleKey = trimmed.split('=')[1].trim();
    }
  }
} catch (e) {
  console.warn('Could not read .env.local:', e.message);
}

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function parseBase64(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const contentType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  return { buffer, contentType, ext };
}

async function uploadBuffer(buffer, path, contentType) {
  const { data, error } = await supabase.storage
    .from('velime-media')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });
  if (error) {
    console.error('Upload error for', path, error);
    return null;
  }
  const { data: pubData } = supabase.storage
    .from('velime-media')
    .getPublicUrl(path);
  return pubData.publicUrl;
}

async function migrate() {
  console.log('--- STARTING BASE64 MIGRATION TO SUPABASE STORAGE ---');

  // 1. Products
  const { data: products, error: pError } = await supabase.from('products').select('*');
  if (pError) {
    console.error('Failed to fetch products:', pError);
    return;
  }

  console.log(`Found ${products.length} products to check...`);

  for (const product of products) {
    let updated = false;
    let mainImageUrl = product.image;
    let imagesList = Array.isArray(product.images) ? [...product.images] : [];

    // Check main image
    if (mainImageUrl && mainImageUrl.startsWith('data:image/')) {
      const parsed = parseBase64(mainImageUrl);
      if (parsed) {
        const filePath = `products/${product.id}_main.${parsed.ext}`;
        console.log(`Uploading main image for product ${product.name} (${Math.round(parsed.buffer.length / 1024)} KB)...`);
        const url = await uploadBuffer(parsed.buffer, filePath, parsed.contentType);
        if (url) {
          mainImageUrl = url;
          updated = true;
        }
      }
    }

    // Check gallery images
    const newImagesList = [];
    for (let i = 0; i < imagesList.length; i++) {
      const img = imagesList[i];
      if (img && img.startsWith('data:image/')) {
        const parsed = parseBase64(img);
        if (parsed) {
          const filePath = `products/${product.id}_gallery_${i}.${parsed.ext}`;
          console.log(`Uploading gallery image ${i} for ${product.name} (${Math.round(parsed.buffer.length / 1024)} KB)...`);
          const url = await uploadBuffer(parsed.buffer, filePath, parsed.contentType);
          if (url) {
            newImagesList.push(url);
            updated = true;
          } else {
            newImagesList.push(img);
          }
        } else {
          newImagesList.push(img);
        }
      } else {
        newImagesList.push(img);
      }
    }

    if (updated) {
      console.log(`Updating database row for product: ${product.name}...`);
      const { error: uError } = await supabase
        .from('products')
        .update({
          image: mainImageUrl,
          images: newImagesList,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (uError) {
        console.error('Update failed for product', product.name, uError);
      } else {
        console.log(`✓ Product ${product.name} migrated to Supabase CDN successfully!`);
      }
    } else {
      console.log(`Product ${product.name} already uses clean URLs.`);
    }
  }

  // 2. Categories
  const { data: categories, error: cError } = await supabase.from('categories').select('*');
  if (!cError && categories) {
    for (const cat of categories) {
      if (cat.image && cat.image.startsWith('data:image/')) {
        const parsed = parseBase64(cat.image);
        if (parsed) {
          const filePath = `categories/${cat.id || cat.slug}.${parsed.ext}`;
          console.log(`Uploading category image for ${cat.name}...`);
          const url = await uploadBuffer(parsed.buffer, filePath, parsed.contentType);
          if (url) {
            await supabase.from('categories').update({ image: url }).eq('id', cat.id);
            console.log(`✓ Category ${cat.name} updated!`);
          }
        }
      }
    }
  }

  // 3. Site Settings
  const { data: settings, error: sError } = await supabase.from('site_settings').select('*');
  if (!sError && settings && settings.length > 0) {
    const s = settings[0];
    let sUpdated = false;
    let heroImg = s.hero_image;
    let lookbook = Array.isArray(s.lookbook_photos) ? [...s.lookbook_photos] : [];

    if (heroImg && heroImg.startsWith('data:image/')) {
      const parsed = parseBase64(heroImg);
      if (parsed) {
        const filePath = `hero/hero_${Date.now()}.${parsed.ext}`;
        const url = await uploadBuffer(parsed.buffer, filePath, parsed.contentType);
        if (url) {
          heroImg = url;
          sUpdated = true;
        }
      }
    }

    const newLookbook = [];
    for (let i = 0; i < lookbook.length; i++) {
      const lb = lookbook[i];
      if (lb && lb.startsWith('data:image/')) {
        const parsed = parseBase64(lb);
        if (parsed) {
          const filePath = `lookbook/lb_${i}.${parsed.ext}`;
          const url = await uploadBuffer(parsed.buffer, filePath, parsed.contentType);
          if (url) {
            newLookbook.push(url);
            sUpdated = true;
          } else {
            newLookbook.push(lb);
          }
        } else {
          newLookbook.push(lb);
        }
      } else {
        newLookbook.push(lb);
      }
    }

    if (sUpdated) {
      await supabase.from('site_settings').update({
        hero_image: heroImg,
        lookbook_photos: newLookbook,
      }).eq('id', s.id);
      console.log('✓ Site settings migrated to clean CDN URLs!');
    }
  }

  console.log('--- ALL MIGRATIONS COMPLETE ---');
}

migrate().catch(console.error);
