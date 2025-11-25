
import { LineItem } from '../types';

/**
 * Copies scope items to clipboard in both HTML Table and Plain Text formats.
 * This trick forces Xactimate (and Excel) to recognize columns instead of pasting text into one cell.
 */
export const copyScopeToClipboard = async (items: LineItem[]): Promise<boolean> => {
  try {
    if (!items || items.length === 0) return false;

    // 1. Construct HTML Table Representation (For Xactimate Grid)
    // Structure: <table><tr><td>CAT</td><td>SEL</td><td>ACT</td><td>QTY</td><td>DESC</td></tr>...
    let htmlContent = '<table border="0" cellspacing="0" cellpadding="0">';
    
    items.forEach(item => {
      // Clean data to avoid breaking HTML
      const cat = item.category || '';
      const sel = item.selector || '';
      const act = item.activity || '+';
      const qty = item.quantity || '0';
      const desc = (item.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const unit = item.unit || '';
      
      // We explicitly leave out headers because Xactimate pastes starting at the active cell
      // Columns: CAT | SEL | ACT | QTY | UNIT | DESC
      htmlContent += `<tr><td>${cat}</td><td>${sel}</td><td>${act}</td><td>${qty}</td><td>${unit}</td><td>${desc}</td></tr>`;
    });
    htmlContent += '</table>';

    // 2. Construct Plain Text Representation (Fallback for Notepad)
    const textContent = items.map(i => 
      `${i.category}\t${i.selector}\t${i.activity}\t${i.quantity}\t${i.unit}\t${i.description}`
    ).join('\n');

    // 3. Create Blobs
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const textBlob = new Blob([textContent], { type: 'text/plain' });

    // 4. Write to Clipboard using ClipboardItem
    // This API is supported in modern Chrome/Edge/Safari (HTTPS context usually required)
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
    } else {
      // Fallback for older environments (Text only)
      await navigator.clipboard.writeText(textContent);
    }

    return true;
  } catch (error) {
    console.error('Smart Copy failed:', error);
    // Ultimate Fallback
    try {
        const textFallback = items.map(i => `${i.category}\t${i.selector}\t${i.quantity}`).join('\n');
        await navigator.clipboard.writeText(textFallback);
        return true;
    } catch (e) {
        return false;
    }
  }
};
