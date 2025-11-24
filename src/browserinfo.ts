	export function isChromiumDesktop() {
        if (window != undefined) {
              // Primary Method: Navigator User Agent Data (Client Hints)
  // This is supported in most modern Chromium browsers (Chrome 90+).
  if (navigator.userAgentData) {
    const brands = navigator.userAgentData.brands;
    
    // Check if 'Chromium' is present in the brands array
    const isChromium = brands.some(brandObj => 
      brandObj.brand === 'Chromium'
    );
    
    // The API explicitly provides a mobile boolean
    const isMobile = navigator.userAgentData.mobile;
    
    return isChromium && !isMobile;
  }

  // Secondary Method: Legacy User Agent String Parsing
  // Fallback for older environments or non-standard implementations.
  const ua = navigator.userAgent;
  const vendor = navigator.vendor;

  // Verify the browser is Chromium-based:
  // 1. 'Chrome' exists in the User Agent string
  // 2. The vendor is 'Google Inc.' (standard for Chromium engines)
  const isChromiumEngine = /Chrome/.test(ua) && /Google Inc/.test(vendor);
  
  // Verify the device is NOT mobile:
  // We exclude common mobile identifiers. Note that 'Mobile' is the standard
  // token added by Chromium on mobile devices.
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  return isChromiumEngine && !isMobileUA;
        } else {
            return false;
        }
}