// Storage Module
const StorageModule = (function() {
  const STORAGE_KEY = 'movieWatchList';
  
  async function convertImageToBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image:', error);
      return imageUrl;
    }
  }
  
  async function saveMovies(movies) {
    try {
      const processedMovies = await Promise.all(
        movies.map(async (movie) => {
          if (!movie.imageUrl.startsWith('data:')) {
            const base64Image = await convertImageToBase64(movie.imageUrl);
            return { ...movie, imageUrl: base64Image };
          }
          return movie;
        })
      );
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processedMovies));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }
  
  function loadMovies() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return [];
    }
  }
  
  return {
    saveMovies,
    loadMovies
  };
})();

// Movie Manager Module
const MovieManager = (function() {
  let movies = [];
  
  function init() {
    movies = StorageModule.loadMovies();
  }
  
  async function addMovie(movie) {
    if (!movie || !movie.title || !movie.year || !movie.imageUrl) {
      return false;
    }
    
    const newMovie = {
      id: Date.now(),
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.year,
      imageUrl: movie.imageUrl
    };
    
    movies.push(newMovie);
    await StorageModule.saveMovies(movies);
    return true;
  }
  
  function removeMovie(id) {
    const initialLength = movies.length;
    movies = movies.filter(movie => movie.id !== id);
    
    if (movies.length < initialLength) {
      StorageModule.saveMovies(movies);
      return true;
    }
    
    return false;
  }
  
  function getAllMovies() {
    return [...movies];
  }
  
  return {
    init,
    addMovie,
    removeMovie,
    getAllMovies
  };
})();

// UI Controller Module
const UIController = (function() {
  const elements = {
    movieList: document.getElementById('movie-list'),
    addMovieForm: document.getElementById('add-movie-form'),
    movieTitle: document.getElementById('movie-title'),
    movieYear: document.getElementById('movie-year'),
    movieImage: document.getElementById('movie-image'),
    movieOriginalTitle: document.getElementById('movie-original-title')
  };
  
  function renderMovieList(movies) {
    elements.movieList.innerHTML = '';
    
    if (movies.length === 0) {
      elements.movieList.innerHTML = '<div class="empty-message">قائمتك فارغة حالياً، أضف بعض الأفلام لتبدأ!</div>';
      return;
    }
    
    movies.forEach(movie => {
      const movieCard = document.createElement('div');
      movieCard.className = 'movie-card';
      movieCard.setAttribute('data-id', movie.id);
      
      movieCard.innerHTML = `
        <div class="movie-image-container">
          <img src="${movie.imageUrl}" alt="${movie.title}" class="movie-image">
        </div>
        <div class="movie-details">
          <h3 class="movie-title">${movie.title}</h3>
          ${movie.originalTitle && movie.originalTitle !== movie.title ? 
            `<p class="movie-original-title">${movie.originalTitle}</p>` : ''}
          <p class="movie-year">${movie.year}</p>
          <button class="btn-remove" data-id="${movie.id}">حذف من القائمة</button>
        </div>
      `;
      
      elements.movieList.appendChild(movieCard);
    });
    
    addRemoveButtonListeners();
  }
  
  function addRemoveButtonListeners() {
    const removeButtons = document.querySelectorAll('.btn-remove');
    removeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'), 10);
        if (confirm('هل أنت متأكد من رغبتك في حذف هذا الفيلم من القائمة؟')) {
          if (MovieManager.removeMovie(id)) {
            renderMovieList(MovieManager.getAllMovies());
          }
        }
      });
    });
  }
  
  function setupEventListeners() {
    elements.addMovieForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const movie = {
        title: elements.movieTitle.value.trim(),
        originalTitle: elements.movieOriginalTitle.value.trim() || elements.movieTitle.value.trim(),
        year: parseInt(elements.movieYear.value, 10),
        imageUrl: elements.movieImage.value.trim()
      };
      
      if (await MovieManager.addMovie(movie)) {
        renderMovieList(MovieManager.getAllMovies());
        elements.addMovieForm.reset();
        elements.movieOriginalTitle.value = '';
        
        // Reset year to current year
        const currentYear = new Date().getFullYear();
        elements.movieYear.value = currentYear;
        
      }
    });
  }
  
  function init() {
    const currentYear = new Date().getFullYear();
    elements.movieYear.value = currentYear;
    elements.movieYear.max = currentYear + 5;
    
    setupEventListeners();
    renderMovieList(MovieManager.getAllMovies());
  }
  
  return {
    init,
    renderMovieList
  };
})();

// Fetch Poster from TMDb API
document.getElementById('fetch-poster').addEventListener('click', async function () {
  const title = document.getElementById('movie-title').value.trim();
  if (!title) {
    alert("الرجاء إدخال اسم الفيلم او المسلسل أولاً.");
    return;
  }

  const apiKey = '3a09d546568e20ccbf17a77b4a4ac888';
  const movieUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}`;
  const tvUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${apiKey}`;

  try {
    let response = await fetch(movieUrl);
    let data = await response.json();

    // If no movie results, try TV shows
    if (!data.results || data.results.length === 0) {
      response = await fetch(tvUrl);
      data = await response.json();
    }

    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      const posterPath = movie.poster_path;
      const originalTitle = movie.original_title || movie.original_name || '';

      if (posterPath) {
        const fullPosterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
        document.getElementById('movie-image').value = fullPosterUrl;
      }

      // Get release year
      if (movie.first_air_date || movie.release_date) {
        const year = (movie.first_air_date || movie.release_date).split('-')[0];
        document.getElementById('movie-year').value = year;
      }
      
      // Set original title
      document.getElementById('movie-original-title').value = originalTitle;

    } else {
      alert("لم يتم العثور على فيلم او مسلسل بهذا الاسم.");
    }
  } catch (error) {
    alert("حدث خطأ أثناء جلب البيانات. الرجاء التأكد من اتصال الإنترنت.");
    console.error(error);
  }
});

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  // Mark body as loaded to trigger fade-in animation
  document.body.classList.add('loaded');
  
  MovieManager.init();
  UIController.init();
});