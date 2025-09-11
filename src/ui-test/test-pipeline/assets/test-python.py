"""
@bruin
name: test_python
type: python

description: A test Python asset for integration testing

columns:
  - name: result_id
    type: integer
    description: Unique identifier for results
  - name: processed_data
    type: string
    description: Processed data output
  - name: timestamp
    type: timestamp
    description: Processing timestamp

@bruin
"""

import pandas as pd
from datetime import datetime

def main():
    # Sample data processing
    data = {
        'result_id': [1, 2, 3, 4, 5],
        'processed_data': ['A', 'B', 'C', 'D', 'E'],
        'timestamp': [datetime.now() for _ in range(5)]
    }
    
    df = pd.DataFrame(data)
    
    # Process the data
    df['processed_data'] = df['processed_data'].str.lower() + '_processed'
    
    return df

if __name__ == "__main__":
    result = main()
    print("Python asset executed successfully!")
    print(result.head())