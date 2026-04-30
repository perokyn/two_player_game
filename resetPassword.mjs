import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('./dev.db');

async function resetPassword() {
    const email = 'admin@example.com';
    const newPassword = 'Hunter_01!';
    
    try {
        console.log(`Hashing new password for ${email}...`);
        // The signup route uses bcrypt.hash(password), usually with 10 salt rounds by default if not specified
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const stmt = db.prepare('UPDATE User SET password = ? WHERE email = ?');
        const info = stmt.run(hashedPassword, email);
        
        if (info.changes > 0) {
            console.log(`Success! Updated password for ${email}.`);
            console.log(`You can now log in with:`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${newPassword}`);
        } else {
            console.log(`Could not find user with email ${email}.`);
        }
    } catch (error) {
        console.error('Error resetting password:', error);
    }
}

resetPassword();