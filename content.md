<div class="space-y-4"><div><h4 class="mb-2 text-sm font-semibold text-gray-900">Nodes (25)</h4><pre class="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">[
  {
    "id": "eca9df32-44e3-4f5f-93e3-b3a593baa167",
    "type": "custom",
    "position": {
      "x": 370.67935976304676,
      "y": 461.2389609029127
    },
    "data": {
      "label": "Linear Algebra",
      "content": "Linear Algebra required for regression",
      "subGraphId": null
    },
    "measured": {
      "width": 310,
      "height": 86
    }
  },
  {
    "id": "00995f11-55fb-40fc-a16d-453ca2fb0ef7",
    "type": "custom",
    "position": {
      "x": 948.572155163967,
      "y": 436.275701460375
    },
    "width": 259,
    "height": 135,
    "style": {
      "width": 259,
      "height": 135
    },
    "data": {
      "label": "Inner Product",
      "content": "$$\n\\langle x, y\\rangle = x^Ty = \\sum_{i=1}^nx_iy_i\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 259,
      "height": 135
    }
  },
  {
    "id": "87d0a6bc-b829-4fb3-89af-69ae1ed7c7f2",
    "type": "custom",
    "position": {
      "x": 1256.3276607185294,
      "y": 435.5839881600549
    },
    "width": 257,
    "height": 138,
    "style": {
      "width": 257,
      "height": 138
    },
    "data": {
      "label": "The Norm",
      "content": "## Euclidean Norm\n$$\n||x|| = \\sqrt{\\langle x, x \\rangle}\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 257,
      "height": 138
    }
  },
  {
    "id": "6a4fbee1-e187-4d1c-8c9c-71e7a07311f1",
    "type": "custom",
    "position": {
      "x": 1090.384530207015,
      "y": 644.2542394449927
    },
    "width": 263,
    "height": 118,
    "style": {
      "width": 263,
      "height": 118
    },
    "data": {
      "label": "Cauchy-Schwarz inequality",
      "content": "$$\n|\\langle x, y \\rangle | \\le ||x||\\cdot||y||\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 263,
      "height": 118
    }
  },
  {
    "id": "3f98b1e3-0bf5-45a6-ad04-c78af7706715",
    "type": "custom",
    "position": {
      "x": 1591.8440116592424,
      "y": 516.831321102625
    },
    "width": 526,
    "height": 372,
    "style": {
      "width": 526,
      "height": 372
    },
    "data": {
      "label": "Triangle Inequality",
      "content": "$$\n||x+y|| \\le ||x|| + ||y||\n$$\n\n### Proof\n$$\n\\begin{align*}\n||x + y ||^2 &amp;= \\langle x + y, x + y \\rangle \\\\\n&amp;= \\langle x, x \\rangle + 2 \\langle  x, y \\rangle + \\langle y, y \\rangle \\\\\n&amp;= ||x||^2 + 2 \\langle x, y \\rangle + ||y||^2 \\\\\n&amp;\\le ||x||^2 + 2||x||\\cdot ||y|| + ||y||^2  &amp; \\text{Cauchy-Schwarz}\\\\ \n&amp;\\le \\left(||x|| +||y||\\right)^2\n\\end{align*}\n$$\nTaking the square root of both sides completes the proof",
      "subGraphId": null
    },
    "measured": {
      "width": 526,
      "height": 372
    }
  },
  {
    "id": "c5445b61-77b1-4e87-8796-151b4ed7148e",
    "type": "custom",
    "position": {
      "x": 1627.8031240353346,
      "y": -87.03521534523162
    },
    "width": 396,
    "height": 170,
    "style": {
      "width": 396,
      "height": 170
    },
    "data": {
      "label": "Orthogonal vectors",
      "content": "The vectors $x$ and $y$ are orthogonal, denoted as $x \\perp y$ if\n$$\\langle x, y \\rangle = 0$$",
      "subGraphId": null
    },
    "measured": {
      "width": 396,
      "height": 170
    }
  },
  {
    "id": "d2160309-e525-4f90-9c44-e744d41b3e80",
    "type": "custom",
    "position": {
      "x": 1652.5106141052295,
      "y": 266.7661957543939
    },
    "data": {
      "label": "Orthonormal",
      "content": "The set of vectors $v_1, v_2, \\cdots v_n$ are orthonormal if\n\n$$\n\\langle v_i, v_j \\rangle = \\begin{cases}1 &amp; v_i = v_j \\\\ 0 &amp; v_i \\ne v_j\\end{cases}\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 398,
      "height": 180
    }
  },
  {
    "id": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "type": "custom",
    "position": {
      "x": 151.7004486418596,
      "y": 479.3313278002365
    },
    "width": 120,
    "height": 50,
    "style": {
      "width": 120,
      "height": 50
    },
    "data": {
      "label": "Matrices",
      "content": null,
      "subGraphId": null
    },
    "measured": {
      "width": 120,
      "height": 50
    }
  },
  {
    "id": "f65fafcf-517c-4b95-bc9b-efad24de7f93",
    "type": "custom",
    "position": {
      "x": -718.8247886141246,
      "y": -838.8681580469915
    },
    "width": 551,
    "height": 863,
    "style": {
      "width": 551,
      "height": 863
    },
    "data": {
      "label": "Vector Spaces associated with a matrix",
      "content": "Define a matrix $A$ as\n\n$$\nA = \\begin{pmatrix}\na_{11} &amp; a_{12} &amp; \\cdots &amp; a_{1m} \\\\\na_{21} &amp; a_{22} &amp; \\cdots &amp; a_{2m} \\\\\n\\vdots &amp; \\vdots&amp; \\ddots &amp; \\vdots \\\\\na_{n1} &amp; a_{n2} &amp; \\cdots &amp; a_{nm}\n\\end{pmatrix}\n$$\n\n## Column space\nDenote $A_i = (a_{1i} \\cdots a_{ni})^T$\n\nThen you can represent $A$ as \n\n$$\nA = (A_1, A_2 \\cdots A_m)\n$$\n\nThe column space is defined as\n$$\n\\mathcal{C}(A) = \\{\\alpha_1A_1 + \\alpha_2A_2 + \\cdots +\\alpha_mA_m : \\alpha_1, \\cdots \\alpha_m \\in \\mathbb{R}\\}\n$$\n## Row Space\nDenote $a_i = (a_{i1} \\cdots a_{im})^T$\n\nThen you can represent $A$ as\n\n$$\nA = \\begin{pmatrix}\na_1^T \\\\ \\vdots \\\\ a_n^T\n\\end{pmatrix}\n$$\n\nThe row space is defined as\n$$\n\\mathcal{R}(A) = \\mathcal{C}(A^T)\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 551,
      "height": 863
    }
  },
  {
    "id": "82e0afc3-b903-4733-bc47-e982d1517dd2",
    "type": "custom",
    "position": {
      "x": -613.3588422996927,
      "y": 72.27842385690167
    },
    "width": 444,
    "height": 233,
    "style": {
      "width": 444,
      "height": 233
    },
    "data": {
      "label": "Matrix Product",
      "content": "Given an $n \\times m$ matrix $A = (a_{ij})$ and an $m \\times r$ matrix $B = (b_{ij})$, their product is defined as the $n \\times r$ matrix $C = (c_{ij})$ such that\n\n$$\nc_{ij} = \\sum_{k=1}^ma_{ik}b_{kj}\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 444,
      "height": 233
    }
  },
  {
    "id": "85b8ae52-846a-42ee-b760-070166df7953",
    "type": "custom",
    "position": {
      "x": 752.5888514164378,
      "y": 477.03166452436255
    },
    "data": {
      "label": "Vectors",
      "content": null,
      "subGraphId": null
    },
    "measured": {
      "width": 120,
      "height": 54
    }
  },
  {
    "id": "867d83e2-a478-487e-9106-c5b1a4c28750",
    "type": "custom",
    "position": {
      "x": 582.4785782101949,
      "y": 958.8230659720953
    },
    "data": {
      "label": "Linear independence",
      "content": "A set of vectors $A_1\\cdots A_m \\in \\mathbb{R}^n$ is linearly independent if \n\n$$\n\\alpha_1A_1 + \\cdots + \\alpha_mA_m = 0 \\iff \\alpha_1 \\cdots \\alpha_m = 0\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 461,
      "height": 146
    }
  },
  {
    "id": "0b6bdf55-2798-4a08-a7fa-9081aa9d09d0",
    "type": "custom",
    "position": {
      "x": 1332.1965847192814,
      "y": 964.2792500742273
    },
    "data": {
      "label": "Maximal linear independence",
      "content": "A set of vectors $A_1 \\cdots A_m \\in \\mathbb{R}^n$ is maximally linearly independent if\nadding another vector $A^*$ to the set will make it linearly dependent",
      "subGraphId": null
    },
    "measured": {
      "width": 539,
      "height": 134
    }
  },
  {
    "id": "08179a06-d95b-4937-935e-4a90e3437e31",
    "type": "custom",
    "position": {
      "x": 55.80191102935453,
      "y": 950.3555112330298
    },
    "width": 311,
    "height": 162,
    "style": {
      "width": 311,
      "height": 162
    },
    "data": {
      "label": "Rank",
      "content": "A rank of a matrix $(A_1 \\cdots A_m)$ and of the set $\\{A_1 \\cdots A_m\\}$ is the number of maximally linearly independent columns/vectors",
      "subGraphId": null
    },
    "measured": {
      "width": 311,
      "height": 162
    }
  },
  {
    "id": "08434cfd-b306-4c56-b367-7d7c18d9d808",
    "type": "custom",
    "position": {
      "x": 276.14325264039496,
      "y": -285.78752717271885
    },
    "data": {
      "label": "Types of matrices",
      "content": "## Symmetric matrix\n$$\nA^T = A\n$$\n\n## Identity\n$I_n$ is identity if all the diagonals are 1 and everything else is a 0\n\n## Invertible matrix\nAn $n\\times n$ matrix $A$ is invertible if \n\n$$\n\\exists B : AB = BA = I_n\n$$\nYou denote $B = A^{-1}$\n\n## Orthogonal matrix\n$$\nA^{-1} = A^{T}\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 492,
      "height": 563
    }
  },
  {
    "id": "e6b8ca1d-884f-4938-9712-09b9fd5b42d4",
    "type": "custom",
    "position": {
      "x": -704.2528471504131,
      "y": 421.1187674012815
    },
    "width": 485,
    "height": 166,
    "style": {
      "width": 485,
      "height": 166
    },
    "data": {
      "label": "Eigenstuff",
      "content": "For an $n \\times n$ matrix $A$, if there exists a pair of $n$-dimensional vector $x$ and a scalar $\\lambda$ such that $Ax = \\lambda x$, then we call $\\lambda$ as the eigenvalue and $x$ as the eigenvector of $A$",
      "subGraphId": null
    },
    "measured": {
      "width": 485,
      "height": 166
    },
    "selected": false,
    "dragging": false
  },
  {
    "id": "0251f22f-afd7-4183-8e8d-441d471ccc91",
    "type": "custom",
    "position": {
      "x": -748.9319241158862,
      "y": 1164.3412168617847
    },
    "data": {
      "label": "Definiteness",
      "content": "A matrix $A$ is positive semi-definite, denoted by $A \\succeq 0$ if $x^TAx \\ge 0 \\quad \\forall x$\n\nA matrix $A$ is positive definite, $A \\succ 0$ if $x^TAx &gt; 0 \\quad \\forall x$.\n\nFor matrices $A$ and $B$, we say $A \\succeq B \\iff A-B \\succeq 0$",
      "subGraphId": null
    },
    "measured": {
      "width": 577,
      "height": 182
    }
  },
  {
    "id": "8c6e0a82-84dd-4e13-af5e-3ab054c3d8db",
    "type": "custom",
    "position": {
      "x": -1165.2981602444193,
      "y": 1133.5312740575228
    },
    "width": 302,
    "height": 243,
    "style": {
      "width": 302,
      "height": 243
    },
    "data": {
      "label": "Definiteness and eigenvalues",
      "content": "A symmetric matrix $A$ is positive semi-definite iff all its eigenvalues are nonnegative. \n\nIt is positive definite iff all its eigenvalues are positive",
      "subGraphId": null
    },
    "measured": {
      "width": 302,
      "height": 243
    }
  },
  {
    "id": "49baa033-1b0f-4a6e-960e-b7436aa359d3",
    "type": "custom",
    "position": {
      "x": -714.3456630237279,
      "y": -1135.6147280124694
    },
    "data": {
      "label": "Trace",
      "content": "The trace of an $n \\times n$ matrix $A = (a_{ij})$ is\n$$\ntr(A) = \\sum_{i=1}^n A_{ii}\n$$\n\n# Theorem\n$tr(AB) = tr(BA)$ as long as $AB$ and $BA$ are both square matrices",
      "subGraphId": null
    },
    "measured": {
      "width": 547,
      "height": 255
    }
  },
  {
    "id": "b5856cef-e66d-4219-99d3-a41b8aa6a880",
    "type": "custom",
    "position": {
      "x": -2145.4003636530724,
      "y": 757.225525238082
    },
    "width": 657,
    "height": 309,
    "style": {
      "width": 657,
      "height": 309
    },
    "data": {
      "label": "Spectral Theorem",
      "content": "# Eigen decomposition\nIf $A$ is an $n \\times n$ symmetric matrix, then there exists an orthogonal matrix $P$ such that\n$$\nP^T A P = diag\\{\\lambda_1 \\cdots \\lambda_n\\}\n$$\nwhere the $\\lambda$s are the eigenvalues of $A$ and the column vectors of $P= \\{\\gamma_1 \\cdots \\gamma_n\\}$ are the corresponding eigenvectors",
      "subGraphId": null
    },
    "measured": {
      "width": 657,
      "height": 309
    }
  },
  {
    "id": "1657a2c5-208b-4286-b9c1-7e86d365f606",
    "type": "custom",
    "position": {
      "x": -1239.3113299840836,
      "y": -1096.4045244301535
    },
    "data": {
      "label": "Trace and eigenvalues",
      "content": "For an $n\\times n$ symmetric matrix $A$,\n$$\ntr(A) = \\sum_{i=1}^n\\lambda_i\n$$",
      "subGraphId": null
    },
    "measured": {
      "width": 284,
      "height": 179
    }
  },
  {
    "id": "9aef6312-9dfe-4809-86d2-a3acaab4bbc2",
    "type": "custom",
    "position": {
      "x": -704.2322213074146,
      "y": 1460.8532057126797
    },
    "width": 531,
    "height": 429,
    "style": {
      "width": 531,
      "height": 429
    },
    "data": {
      "label": "Projection Matrix",
      "content": "A matrix $H$ is a projection matrix if it is symmetric and $H^2 = H$\n\n\n## Theorem\nIf $H$ is a projection matrix, all its eigenvalues are either 0 or 1\n\n## Theorem\nIf an $n \\times p $ matrix $X$ has $p$ linearly independent columns, then $H = X(X^TX)^{-1}X^T$ is a projection matrix. Conversely, if $n\\times n$ matrix $H$ is a projection matrix with rank $p$, then $H = X(X^TX)^{-1}X^T$ for some $n\\times p$ matrix $X$ with linearly independent columns",
      "subGraphId": null
    },
    "measured": {
      "width": 531,
      "height": 429
    }
  },
  {
    "id": "f6970d28-c438-4528-8f5a-8d501e13d6c0",
    "type": "custom",
    "position": {
      "x": -806.9905969970689,
      "y": 2057.5328546185638
    },
    "width": 634,
    "height": 735,
    "style": {
      "width": 634,
      "height": 735
    },
    "data": {
      "label": "Singular Value Decomposition",
      "content": "An $n \\times m$ matrix $A$ can be decomposed as\n\n$$\nA = UDV^T\n$$\n\nwhere $U$ is $n\\times n$ orthogonal matrix, $V$ is $m \\times n$ orthogonal matrix, and $D$ is an $n\\times m$ diagonal matrix\n\n## Calculating SVD\n* Compute $A^T A$: This is always a square, symmetric $m \\times m$ matrix.\n*  Find Eigenvalues ($\\lambda_i$ ) of $A^T A$: Sort them: $\\lambda_1 \\ge \\lambda_2 \\ge \\dots \\ge 0$.\n  * The singular values are $\\sigma_i = \\sqrt{\\lambda_i}$. Place these on the diagonal of $D$\n* Find Eigenvectors ($v_i$) of $A^T A$:\n    * Ensure they are unit length (normalize them).\n    * Place them as columns in $V$.\n* Find $U$:\n    * For each non-zero $\\sigma_i$, calculate $u_i = \\frac{1}{\\sigma_i} A v_i$.\n    * If $A$ is tall and you need a full $n \\times n$ matrix $U$, use Gram-Schmidt to find remaining orthonormal vectors.",
      "subGraphId": null
    },
    "measured": {
      "width": 634,
      "height": 735
    }
  },
  {
    "id": "f818a844-d1e9-454a-a626-f3cdba040a4e",
    "type": "custom",
    "position": {
      "x": -1813.7654338957664,
      "y": 2077.6760305601006
    },
    "width": 557,
    "height": 691,
    "style": {
      "width": 557,
      "height": 691
    },
    "data": {
      "label": "Low-Rank Approximation",
      "content": "Given a matrix $A$, we can find the SVD as\n$$\nA = UDV^T\n$$\nSuppose the original matrix is of rank $r$, you can reconstruct the original matrix $A$ with 1-rank approximations:\n\n$$\nA = \\sum_{i=1}^rd_iU_iV^T_i\n$$\n\nComputing this sum will give $A$ exactly. But since you sorted the singular values while calculating SVD. The first element of $D$ carries the most information about $A$, then the second and so on.\n\nSo if you want to find the Rank-k approximation, you just need to take the first $k$ singular values:\n\n$$\nA^* = \\sum_{i=1}^kd_iU_iV^T_i\n$$\n\n# Eckart-Young-Mirsky Theorem\nThe theorem states that $A^*$ we calculated above is the absolute best possible approximation you can make",
      "subGraphId": null
    },
    "measured": {
      "width": 557,
      "height": 691
    }
  },
  {
    "id": "e8de43bd-70ea-4586-8121-13a1f395d145",
    "type": "custom",
    "position": {
      "x": -2119.437135684524,
      "y": 2888.187316177622
    },
    "width": 1170,
    "height": 1916,
    "style": {
      "width": 1170,
      "height": 1916
    },
    "data": {
      "label": "Low-Rank approximation code",
      "content": "```py\nimport numpy as np\n\n# 1. Create a sample n x m matrix (5x4)\nA = np.array([\n    [1, 2, 3, 4],\n    [5, 6, 7, 8],\n    [9, 10, 11, 12],\n    [13, 14, 15, 16],\n    [17, 18, 19, 20]\n])\n\n# 2. Perform SVD\n# U is 5x5, s is a 1D array of singular values, Vh is 4x4 (V transpose)\nU, s, Vh = np.linalg.svd(A)\n\nprint(\"Singular Values:\", s)\n\n# 3. Low-Rank Approximation function\ndef low_rank_approx(U, s, Vh, k):\n    # Take the first k components\n    # A_k = sum_{i=1 to k} d_i * U_i * Vh_i\n    \n    # We use np.dot to perform the outer product of each column/row pair\n    # and sum them up as we go\n    Ak = np.zeros((U.shape[0], Vh.shape[0]))\n    for i in range(k):\n        # np.outer creates the rank-1 matrix (Ui * Vi^T)\n        Ak += s[i] * np.outer(U[:, i], Vh[i, :])\n    return Ak\n\n# 4. Compare Rank-1 vs Rank-2 vs Original\nrank_1 = low_rank_approx(U, s, Vh, 1)\nrank_2 = low_rank_approx(U, s, Vh, 2)\n\nprint(\"\\n--- Original Matrix A ---\")\nprint(A)\n\nprint(f\"\\n--- Rank-1 Approximation (Captured {round(s[0]**2 / sum(s**2) * 100, 2)}% energy) ---\")\nprint(rank_1.round(2))\n\nprint(f\"\\n--- Rank-2 Approximation (Captured {round(sum(s[:2]**2) / sum(s**2) * 100, 2)}% energy) ---\")\nprint(rank_2.round(2))\n```",
      "subGraphId": null,
      "lastRunResult": {
        "output": "Singular Values: [5.35202225e+01 2.36342639e+00 2.80168688e-15 3.27120515e-16]\n\n--- Original Matrix A ---\n[[ 1  2  3  4]\n [ 5  6  7  8]\n [ 9 10 11 12]\n [13 14 15 16]\n [17 18 19 20]]\n\n--- Rank-1 Approximation (Captured 99.81% energy) ---\n[[ 2.29  2.48  2.67  2.86]\n [ 5.82  6.31  6.79  7.27]\n [ 9.35 10.13 10.91 11.69]\n [12.89 13.96 15.03 16.1 ]\n [16.42 17.78 19.15 20.51]]\n\n--- Rank-2 Approximation (Captured 100.0% energy) ---\n[[ 1.  2.  3.  4.]\n [ 5.  6.  7.  8.]\n [ 9. 10. 11. 12.]\n [13. 14. 15. 16.]\n [17. 18. 19. 20.]]\n"
      }
    },
    "measured": {
      "width": 1170,
      "height": 1916
    }
  }
]</pre></div><div><h4 class="mb-2 text-sm font-semibold text-gray-900">Edges (29)</h4><pre class="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">[
  {
    "id": "6b084262-f35e-4010-8e77-df9a5020e5aa",
    "source": "00995f11-55fb-40fc-a16d-453ca2fb0ef7",
    "target": "87d0a6bc-b829-4fb3-89af-69ae1ed7c7f2",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "532403a0-18d9-4b76-b42a-4bfb4e4fe2b6",
    "source": "00995f11-55fb-40fc-a16d-453ca2fb0ef7",
    "target": "6a4fbee1-e187-4d1c-8c9c-71e7a07311f1",
    "sourceHandle": "bottom-source",
    "type": "custom"
  },
  {
    "id": "07dbae37-04dd-4da6-863b-c9afaa7eaa90",
    "source": "6a4fbee1-e187-4d1c-8c9c-71e7a07311f1",
    "target": "87d0a6bc-b829-4fb3-89af-69ae1ed7c7f2",
    "sourceHandle": "top-source",
    "targetHandle": "bottom-target",
    "type": "custom"
  },
  {
    "id": "abb13593-e62a-4d0d-8c5b-4f03aa36854e",
    "source": "6a4fbee1-e187-4d1c-8c9c-71e7a07311f1",
    "target": "3f98b1e3-0bf5-45a6-ad04-c78af7706715",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "984f7159-614d-4def-b75b-3fb5427153fd",
    "source": "87d0a6bc-b829-4fb3-89af-69ae1ed7c7f2",
    "target": "c5445b61-77b1-4e87-8796-151b4ed7148e",
    "sourceHandle": "top-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "111053df-ee44-406d-8a33-b6d82eec4281",
    "source": "87d0a6bc-b829-4fb3-89af-69ae1ed7c7f2",
    "target": "d2160309-e525-4f90-9c44-e744d41b3e80",
    "sourceHandle": "top-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "3c365b56-7f00-4ed7-991a-52679dfa6b19",
    "source": "eca9df32-44e3-4f5f-93e3-b3a593baa167",
    "target": "85b8ae52-846a-42ee-b760-070166df7953",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "b719b5dc-a676-4164-8ba6-61bfd33b1137",
    "source": "85b8ae52-846a-42ee-b760-070166df7953",
    "target": "00995f11-55fb-40fc-a16d-453ca2fb0ef7",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "4ef9f036-7093-4c54-a410-ff4512315983",
    "source": "85b8ae52-846a-42ee-b760-070166df7953",
    "target": "867d83e2-a478-487e-9106-c5b1a4c28750",
    "sourceHandle": "bottom-source",
    "type": "custom"
  },
  {
    "id": "03abd00f-7c60-4c92-91ac-5372b9bac96c",
    "source": "867d83e2-a478-487e-9106-c5b1a4c28750",
    "target": "0b6bdf55-2798-4a08-a7fa-9081aa9d09d0",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "3adf3b0e-befc-4090-aa5d-1144ee748a6f",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "08179a06-d95b-4937-935e-4a90e3437e31",
    "sourceHandle": "bottom-source",
    "type": "custom"
  },
  {
    "id": "6d7b10c2-f55c-4852-a22f-c5426d28415a",
    "source": "08179a06-d95b-4937-935e-4a90e3437e31",
    "target": "867d83e2-a478-487e-9106-c5b1a4c28750",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "9202de29-d1e6-455e-b00c-8bd5688399e1",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "0251f22f-afd7-4183-8e8d-441d471ccc91",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "06164d4c-9c7d-4675-8c09-1d48f222d9ff",
    "source": "8c6e0a82-84dd-4e13-af5e-3ab054c3d8db",
    "target": "0251f22f-afd7-4183-8e8d-441d471ccc91",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "fe39c691-9d8d-44ae-898d-cc8e8d340a7c",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "49baa033-1b0f-4a6e-960e-b7436aa359d3",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "61d5d63d-576d-456c-81d4-085e5d7b951b",
    "source": "1657a2c5-208b-4286-b9c1-7e86d365f606",
    "target": "e6b8ca1d-884f-4938-9712-09b9fd5b42d4",
    "sourceHandle": "bottom-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "9d2e5a1f-e33d-4aa6-a92d-a03db09b12a6",
    "source": "1657a2c5-208b-4286-b9c1-7e86d365f606",
    "target": "49baa033-1b0f-4a6e-960e-b7436aa359d3",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "2dd004d9-1a12-4771-8784-b69facd49cda",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "eca9df32-44e3-4f5f-93e3-b3a593baa167",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "b7868bf4-3566-4b96-a66e-3c3dfab1be40",
    "source": "e6b8ca1d-884f-4938-9712-09b9fd5b42d4",
    "target": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "sourceHandle": "right-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "4e9a1955-6c26-4055-a254-d68756c98bee",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "82e0afc3-b903-4733-bc47-e982d1517dd2",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "af030fee-ceaa-403b-b2b0-abcf2310c08b",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "08434cfd-b306-4c56-b367-7d7c18d9d808",
    "sourceHandle": "left-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "cb5e52a8-e52a-4a22-947b-8a2f89cc8e29",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "f65fafcf-517c-4b95-bc9b-efad24de7f93",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "dec64570-3bb1-4968-b6d2-d6e05881b85a",
    "source": "e6b8ca1d-884f-4938-9712-09b9fd5b42d4",
    "target": "b5856cef-e66d-4219-99d3-a41b8aa6a880",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "350ee14e-2494-4256-9277-e28c28076ff8",
    "source": "0251f22f-afd7-4183-8e8d-441d471ccc91",
    "target": "e6b8ca1d-884f-4938-9712-09b9fd5b42d4",
    "sourceHandle": "top-source",
    "targetHandle": "bottom-target",
    "type": "custom"
  },
  {
    "id": "cbdd4e79-ac47-4151-ad0b-d0ab33c1efd7",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "9aef6312-9dfe-4809-86d2-a3acaab4bbc2",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "dc668b18-debe-46c5-ac3d-812c4ea39f40",
    "source": "310fb43a-c111-4bc0-b696-e1f5b30ece31",
    "target": "f6970d28-c438-4528-8f5a-8d501e13d6c0",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "097a2bd3-18f6-4155-ba69-da3d8c4b2083",
    "source": "b5856cef-e66d-4219-99d3-a41b8aa6a880",
    "target": "8c6e0a82-84dd-4e13-af5e-3ab054c3d8db",
    "sourceHandle": "bottom-source",
    "targetHandle": "left-target",
    "type": "custom"
  },
  {
    "id": "701f2ee0-eebc-4a62-a1c0-7e766d11213b",
    "source": "f6970d28-c438-4528-8f5a-8d501e13d6c0",
    "target": "f818a844-d1e9-454a-a626-f3cdba040a4e",
    "sourceHandle": "left-source",
    "targetHandle": "right-target",
    "type": "custom"
  },
  {
    "id": "479de2aa-f125-4b2c-9c9b-6410b2b6c970",
    "source": "f818a844-d1e9-454a-a626-f3cdba040a4e",
    "target": "e8de43bd-70ea-4586-8121-13a1f395d145",
    "sourceHandle": "bottom-source",
    "type": "custom"
  }
]</pre></div></div>
