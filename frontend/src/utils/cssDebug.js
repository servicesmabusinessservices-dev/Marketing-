// CSS Debugging utility
export function logCSSStatus() {
  console.log('=== CSS Debug Info ===');
  console.log('HTML classes:', document.documentElement.className);
  console.log('Body background:', getComputedStyle(document.body).background);  
  console.log('--background-primary:', getComputedStyle(document.documentElement).getPropertyValue('--background-primary'));
  console.log('--text-primary:', getComputedStyle(document.documentElement).getPropertyValue('--text-primary'));
  console.log('--navy:', getComputedStyle(document.documentElement).getPropertyValue('--navy'));
  
  const loginScreen = document.querySelector('.login-screen');
  if (loginScreen) {
    console.log('Login screen background:', getComputedStyle(loginScreen).background);
    console.log('Login screen display:', getComputedStyle(loginScreen).display);
  }
  console.log('=====================');
}
