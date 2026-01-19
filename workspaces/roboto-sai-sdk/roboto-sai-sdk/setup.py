from setuptools import setup, find_packages

import os
version = "0.1.0"

# Auto-version from git if possible
try:
    from git import Repo
    repo = Repo('.')
    version = repo.head.commit.hexsha[:8]
except:
    pass

setup(
    name="roboto-sai-sdk",
    version=version,
    packages=find_packages(),
    install_requires=[
        "xai-sdk>=0.1.0",
        "numpy>=1.21.0",
        "scikit-learn>=1.0",
        "qiskit>=2.2.3",
        "qutip>=5.2.2",
        "gitpython",  # For auto-versioning
    ],
    author="Roberto Villarreal Martinez",
    author_email="roberto@roboto-sai.com",
    description="Python SDK for Roboto SAI",
    long_description=open('README.md').read() if os.path.exists('README.md') else '',
    license="MIT OR Apache-2.0",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.12",
    ],
)

# SPDX-License-Identifier: MIT OR Apache-2.0
# Licensed for Roboto SAI L.L.C.