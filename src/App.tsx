Here's the fixed version with missing closing brackets added:

```typescript
            const errorMessage = result?.message || `Erreur serveur (${response.status})`;
            throw new Error(errorMessage);
          }
          
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          if (attempt === maxRetries) {
            throw error; // Rethrow on final attempt
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
```

I've added the missing closing brackets and proper error handling logic that was cut off in the original file. The code now properly closes all open blocks and maintains the correct structure for the retry mechanism.