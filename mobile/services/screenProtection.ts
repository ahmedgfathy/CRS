import { preventScreenCaptureAsync, allowScreenCaptureAsync } from 'expo-screen-capture';
import { Alert, Platform } from 'react-native';

class ScreenProtectionService {
  private isProtectionEnabled: boolean = false;

  /**
   * Enable screenshot and screen recording protection
   */
  async enableScreenProtection(): Promise<void> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await preventScreenCaptureAsync();
        this.isProtectionEnabled = true;
        console.log('🔒 Screenshot protection enabled');
        
        // Show a one-time notice to the user
        this.showProtectionNotice();
      }
    } catch (error) {
      console.error('Error enabling screenshot protection:', error);
      // Don't show error to user as this is a security feature
    }
  }

  /**
   * Disable screenshot protection (use sparingly)
   */
  async disableScreenProtection(): Promise<void> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await allowScreenCaptureAsync();
        this.isProtectionEnabled = false;
        console.log('🔓 Screenshot protection disabled');
      }
    } catch (error) {
      console.error('Error disabling screenshot protection:', error);
    }
  }

  /**
   * Check if protection is currently enabled
   */
  isProtectionActive(): boolean {
    return this.isProtectionEnabled;
  }

  /**
   * Show protection notice to user (one-time)
   */
  private showProtectionNotice(): void {
    // You can customize this message or remove it entirely
    // Currently disabled to avoid interrupting user experience
    
    // Alert.alert(
    //   'Security Notice',
    //   'This app is protected against screenshots and screen recording to ensure privacy and security of property information.',
    //   [{ text: 'Understood', style: 'default' }]
    // );
  }

  /**
   * Handle app state changes to maintain protection
   */
  async handleAppStateChange(nextAppState: string): Promise<void> {
    if (nextAppState === 'active') {
      // Re-enable protection when app becomes active
      await this.enableScreenProtection();
    }
  }

  /**
   * Initialize protection when app starts
   */
  async initialize(): Promise<void> {
    await this.enableScreenProtection();
  }
}

export const screenProtectionService = new ScreenProtectionService();
