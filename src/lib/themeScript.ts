export const THEME_KEY = "rdr-laptop-advisor/theme";
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Dijalankan di <head> sebelum halaman digambar: memakai tema tersimpan,
 * atau tema sistem bila belum pernah memilih, supaya tidak berkedip.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${SYSTEM_DARK}").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;
