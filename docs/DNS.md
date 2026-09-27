# NightDream.io DNS → GitHub Pages

**Live today:** https://kshot3000.github.io/NightDream.io/

**Custom domain goal:** https://nightdream.xyz/

Domain purchased 2026-09-27. As of purchase the apex had no DNS records yet — add the records below to activate.

## Recommended records

At your DNS registrar for `nightdream.xyz`:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `kshot3000.github.io.` |

Then in GitHub → **Settings → Pages → Custom domain** set `nightdream.xyz` and enable **Enforce HTTPS** after propagation.

Optional: add a root `CNAME` file containing `nightdream.xyz` **only after** DNS is ready (early CNAME can break the `*.github.io` URL).

## Verify

```bash
dig +short nightdream.xyz A
dig +short www.nightdream.xyz CNAME
curl -I https://nightdream.xyz/
```

## Branding

- **X:** [@kshot9000](https://x.com/kshot9000)
- **ADA:** `addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v`
