import sqlite3
import pandas as pd

conn = sqlite3.connect('data/cs_poc.db')

df = pd.read_sql("""
  SELECT i.*, c.billing_type, c.plan, c.renewal_date,
         u.utilization_rate
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate
    FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = 'データエクスポート'
  AND i.date >= date('now', '-28 days')
""", conn)
print('=== 直近28日のデータエクスポート問い合わせ ===')
print(f'件数: {len(df)}')
print(df[['inquiry_id','company_id','date','priority','status','escalated','satisfaction_score','billing_type','plan','utilization_rate']].to_string())

df_monthly = pd.read_sql("""
  SELECT strftime('%Y-%m', date) as month, COUNT(*) as cnt
  FROM inquiries
  WHERE topic_ai = 'データエクスポート'
  GROUP BY month ORDER BY month
""", conn)
print('\n=== 月別トレンド（全期間） ===')
print(df_monthly.to_string())

df_sc = pd.read_sql('SELECT * FROM service_changes ORDER BY date', conn)
print('\n=== service_changes ===')
print(df_sc.to_string())

df_billing = pd.read_sql("""
  SELECT c.billing_type, c.plan, COUNT(*) as cnt,
         AVG(i.satisfaction_score) as avg_sat,
         SUM(i.escalated) as escalated_cnt
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  WHERE i.topic_ai = 'データエクスポート'
  AND i.date >= date('now', '-28 days')
  GROUP BY c.billing_type, c.plan
""", conn)
print('\n=== billing_type x plan 別（直近28日） ===')
print(df_billing.to_string())

df_util = pd.read_sql("""
  SELECT
    CASE WHEN u.utilization_rate < 0.30 THEN '低(<30%)'
         WHEN u.utilization_rate < 0.50 THEN '中(30-50%)'
         ELSE '高(>=50%)' END as util_band,
    COUNT(*) as cnt
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate
    FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = 'データエクスポート'
  AND i.date >= date('now', '-28 days')
  GROUP BY util_band
""", conn)
print('\n=== 利用率帯別（直近28日） ===')
print(df_util.to_string())

df_comp = pd.read_sql("""
  SELECT i.company_id, c.billing_type, c.plan,
         CAST(julianday(c.renewal_date) - julianday('now') AS INTEGER) as days_to_renewal,
         ROUND(u.utilization_rate, 2) as util_rate,
         COUNT(*) as inquiry_cnt,
         SUM(i.escalated) as escalated_cnt,
         AVG(i.satisfaction_score) as avg_sat
  FROM inquiries i
  JOIN contracts c ON i.company_id = c.company_id
  LEFT JOIN (
    SELECT company_id, utilization_rate
    FROM usage
    WHERE year_month = (SELECT MAX(year_month) FROM usage)
  ) u ON i.company_id = u.company_id
  WHERE i.topic_ai = 'データエクスポート'
  AND i.date >= date('now', '-28 days')
  GROUP BY i.company_id
  ORDER BY escalated_cnt DESC, inquiry_cnt DESC
""", conn)
print('\n=== 企業別サマリ（直近28日） ===')
print(df_comp.to_string())

df_week = pd.read_sql("""
  SELECT strftime('%Y-%W', date) as week, COUNT(*) as cnt
  FROM inquiries
  WHERE topic_ai = 'データエクスポート'
  GROUP BY week ORDER BY week
""", conn)
print('\n=== 週別トレンド（全期間） ===')
print(df_week.to_string())
