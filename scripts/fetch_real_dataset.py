#!/usr/bin/env python3
"""
Download the REAL Customer Support on Twitter dataset (twcs.csv, ~516MB) from
the public Hugging Face mirror SunidhiSviram/twcs, and filter to all
@AmazonHelp-related tweets. Streams so we never hold 516MB in memory.
"""
import csv
import io
import sys
import urllib.request

URL = "https://huggingface.co/datasets/SunidhiSriram/twcs/resolve/main/twcs.csv"
OUT = "/home/z/my-project/data/amazonhelp_tweets.csv"

def main():
    kept = 0
    scanned = 0
    brand_replies = 0
    customer_msgs = 0
    out_f = open(OUT, "w", newline="", encoding="utf-8")
    writer = csv.writer(out_f)

    req = urllib.request.Request(URL, headers={"User-Agent": "aabir-data/1.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        # Wrap the raw byte stream: BufferedReader → TextIOWrapper with newline=''
        # csv.reader handles embedded newlines in quoted fields only when the
        # underlying iterable yields lines with universal newline translation.
        reader_file = io.TextIOWrapper(io.BufferedReader(resp), encoding="utf-8", newline="")
        reader = csv.reader(reader_file)
        header = next(reader)
        writer.writerow(header)
        for row in reader:
            scanned += 1
            if scanned % 500000 == 0:
                print(f"  scanned {scanned:,} rows | kept {kept:,}", file=sys.stderr, flush=True)
            if len(row) < 7:
                continue
            tweet_id, author_id, inbound, created_at, text = row[0], row[1], row[2], row[3], row[4]
            if author_id == "AmazonHelp":
                writer.writerow(row)
                kept += 1
                brand_replies += 1
            elif (inbound or "").lower() == "true" and (text or "").startswith("@AmazonHelp"):
                writer.writerow(row)
                kept += 1
                customer_msgs += 1
    out_f.close()
    print(f"\nDONE: scanned {scanned:,} rows | kept {kept:,} (brand replies: {brand_replies}, customer msgs: {customer_msgs})")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
