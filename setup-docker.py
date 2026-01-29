#!/usr/bin/env python3
"""
Setup Docker Compose with JWT Public Key
This script automatically injects your public key into docker-compose.yml
"""

import os
import sys
import shutil

def main():
    print("🔧 Setting up Docker Compose configuration...")
    print()

    # Check if public key exists
    key_path = "server/keys/public_key.pem"
    if not os.path.exists(key_path):
        print(f"❌ Public key not found at {key_path}")
        print()
        print("Please run ./setup.sh first to generate JWT keys.")
        sys.exit(1)

    # Check if docker-compose.yml exists
    compose_path = "docker-compose.yml"
    if not os.path.exists(compose_path):
        print(f"❌ {compose_path} not found")
        sys.exit(1)

    print("📝 Reading public key...")

    # Read the public key
    try:
        with open(key_path, 'r') as f:
            public_key = f.read().strip()
    except Exception as e:
        print(f"❌ Failed to read public key: {e}")
        sys.exit(1)

    print("✓ Public key read successfully")
    print()
    print("📝 Updating docker-compose.yml...")

    # Create backup
    backup_path = f"{compose_path}.backup"
    shutil.copy2(compose_path, backup_path)
    print(f"✓ Backup created at {backup_path}")

    # Read docker-compose.yml
    try:
        with open(compose_path, 'r') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ Failed to read {compose_path}: {e}")
        sys.exit(1)

    # Find and replace the JWT_PUBLIC_KEY section
    new_lines = []
    i = 0
    replaced = False

    while i < len(lines):
        line = lines[i]

        # Look for JWT_PUBLIC_KEY line
        if 'JWT_PUBLIC_KEY:' in line and '|' in line:
            # Add the JWT_PUBLIC_KEY: | line
            new_lines.append(line)
            i += 1

            # Skip old key lines until we find a line that's not part of the key block
            indent = '        '  # 8 spaces for the key content
            while i < len(lines):
                next_line = lines[i]
                # Check if this is still part of the key block
                if next_line.startswith(indent) or next_line.strip() == '':
                    # Skip lines that are part of the old key or empty
                    if 'BEGIN PUBLIC KEY' in next_line or 'END PUBLIC KEY' in next_line or 'REPLACE_WITH_YOUR_PUBLIC_KEY' in next_line:
                        i += 1
                        continue
                    # If it's not a key line, break
                    if next_line.strip() and not next_line.strip().startswith('-'):
                        break
                    i += 1
                else:
                    # We've reached a new section
                    break

            # Insert the new public key
            for key_line in public_key.split('\n'):
                new_lines.append(f'{indent}{key_line}\n')

            replaced = True
            continue

        new_lines.append(line)
        i += 1

    if not replaced:
        print("⚠️  JWT_PUBLIC_KEY section not found or already configured")
    else:
        print("✓ Public key injected successfully")

    # Write the updated file
    try:
        with open(compose_path, 'w') as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"❌ Failed to write {compose_path}: {e}")
        sys.exit(1)

    print()

    # Check for license key
    content = ''.join(new_lines)
    if 'YOUR_LICENSE_KEY_HERE' in content:
        print("⚠️  License key not configured")
        print()
        print("You need a license key from: https://my.nutrient.io/")
        print()

        try:
            license_key = input("Enter your Nutrient license key (or press Enter to skip): ").strip()

            if license_key:
                with open(compose_path, 'r') as f:
                    content = f.read()

                content = content.replace('YOUR_LICENSE_KEY_HERE', license_key)

                with open(compose_path, 'w') as f:
                    f.write(content)

                print("✓ License key updated")
            else:
                print()
                print("⚠️  Skipped license key setup")
                print("   You'll need to manually add it to docker-compose.yml before starting")
        except KeyboardInterrupt:
            print()
            print("⚠️  Setup interrupted")
            sys.exit(1)
    elif 'ACTIVATION_KEY:' in content and 'YOUR_LICENSE_KEY_HERE' not in content:
        print("✓ License key already configured")

    print()
    print("✅ Docker Compose setup complete!")
    print()
    print("📋 Next steps:")
    print()
    print("1. Start Document Engine:")
    print("   docker-compose up -d")
    print()
    print("2. Verify it's running:")
    print("   docker-compose ps")
    print("   curl http://localhost:5000/health")
    print()
    print("3. Check dashboard (if enabled):")
    print("   http://localhost:5000/dashboard")
    print("   Username: dashboard")
    print("   Password: secret")
    print()

if __name__ == '__main__':
    main()
