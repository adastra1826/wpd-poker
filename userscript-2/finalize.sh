#!/usr/bin/env python3
"""
Script to find and replace text in all files in the current directory.
"""

import os
import sys

# Define your search and replacement terms here
SEARCH_TERM = "[HOSTNAME]"
REPLACEMENT_TERM = "watchpeopledie.tv"

# File extensions to include (leave empty to process all files)
# Example: ['.txt', '.js', '.html', '.css']
INCLUDE_EXTENSIONS = ['.js']

# File extensions to exclude
# Example: ['.pyc', '.exe', '.bin', '.png', '.jpg', '.gif']
EXCLUDE_EXTENSIONS = ['.pyc', '.exe', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz']

# Directories to skip
SKIP_DIRS = ['.git', '__pycache__', 'node_modules', '.venv', 'venv']


def should_process_file(filepath):
    """Determine if a file should be processed based on its extension."""
    _, ext = os.path.splitext(filepath)
    
    # Skip if in exclude list
    if ext.lower() in EXCLUDE_EXTENSIONS:
        return False
    
    # If include list is specified, only process those extensions
    if INCLUDE_EXTENSIONS:
        return ext.lower() in INCLUDE_EXTENSIONS
    
    # Try to detect if it's a binary file
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.read(512)  # Try to read first 512 bytes
        return True
    except (UnicodeDecodeError, PermissionError):
        return False


def replace_in_file(filepath, search_term, replacement_term):
    """Replace search_term with replacement_term in a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if search term exists in file
        if search_term in content:
            new_content = content.replace(search_term, replacement_term)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            # Count occurrences
            count = content.count(search_term)
            return True, count
        
        return False, 0
    
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, 0


def main():
    """Main function to process all files in current directory."""
    if not SEARCH_TERM:
        print("Error: SEARCH_TERM is empty. Please define a search term.")
        sys.exit(1)
    
    print(f"Searching for: '{SEARCH_TERM}'")
    print(f"Replacing with: '{REPLACEMENT_TERM}'")
    print("-" * 50)
    
    total_files_processed = 0
    total_files_modified = 0
    total_replacements = 0
    
    # Walk through current directory
    for root, dirs, files in os.walk('.'):
        # Remove directories we want to skip
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for filename in files:
            filepath = os.path.join(root, filename)
            
            # Skip the script itself
            if os.path.abspath(filepath) == os.path.abspath(__file__):
                continue
            
            if should_process_file(filepath):
                total_files_processed += 1
                modified, count = replace_in_file(filepath, SEARCH_TERM, REPLACEMENT_TERM)
                
                if modified:
                    total_files_modified += 1
                    total_replacements += count
                    print(f"✓ Modified: {filepath} ({count} replacement{'s' if count > 1 else ''})")
    
    print("-" * 50)
    print(f"Summary:")
    print(f"  Files processed: {total_files_processed}")
    print(f"  Files modified: {total_files_modified}")
    print(f"  Total replacements: {total_replacements}")
    
    if total_files_modified == 0:
        print(f"\nNo files contained the search term '{SEARCH_TERM}'")


if __name__ == "__main__":
    main()