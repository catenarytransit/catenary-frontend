<script lang="ts">
	import '../app.css';

    import { page } from '$app/state';
</script>

    <div class="flex flex-col max-w-md mx-auto h-screen justify-center items-center">
        <img src="https://maps.catenarymaps.org/logo.svg" alt="Catenary Maps" class="logo w-48">
    
    <div class="flex flex-col">
        <h1 class="error-code text-center">404</h1>
        <p class="message text-center">
            Oh no! It seems this is a ghost station.
        </p>
        <a href="https://maps.catenarymaps.org" class=" mx-auto text-center home-button">Return to Central Station</a>
    </div>

    </div>


    <style>
         .error-code {
            font-size: 8rem;
            font-weight: 700;
            color: #2d4059;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            margin-bottom: -10px;
        }

        .message {
            font-size: 1.5rem;
            color: #2d4059;
            margin-bottom: 30px;
            max-width: 600px;
        }

        .home-button {
            background: #e74c3c;
            color: white;
            padding: 15px 40px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            border: none;
            cursor: pointer;
        }

        .home-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
        }

    </style>