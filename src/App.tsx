import { AuthProvider } from './contexts/AuthContext';
import { AppContainer } from './containers/AppContainer';

function App() {
  return (
    <AuthProvider>
      <AppContainer />
    </AuthProvider>
  );
}

export default App;


