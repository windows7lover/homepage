---
layout: default
title: Publications
nav_position: 2
---

{% bibliography --file references --group_by type --group_order ascending --query @*[author ^= *Scieur* && journal !~ ^arXiv] %}

## Arxiv
{% bibliography --file references --query @*[journal ^= arXiv] %}
